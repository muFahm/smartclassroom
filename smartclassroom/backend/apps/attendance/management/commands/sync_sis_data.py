"""
Django management command to sync SIS Trisakti data from JSON files
"""
import json
import os
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.attendance.models import (
    SisCourse, SisLecturer, SisStudent,
    SisCourseClass, SisCourseClassLecturer, SisEnrollment
)


class Command(BaseCommand):
    help = 'Sync SIS Trisakti data from JSON response files'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--json-path',
            type=str,
            help='Path to the JSON file containing SIS data (response-datakelasIF.json)',
        )
        parser.add_argument(
            '--program',
            type=str,
            default='IF',
            help='Program code (IF, SI, etc.)',
        )
    
    def handle(self, *args, **options):
        json_path = options.get('json_path')
        program = options.get('program', 'IF')
        
        if not json_path:
            # Default path - look in sisTrisakti folder
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            )))
            # Go up to project root and then to sisTrisakti
            project_root = os.path.dirname(os.path.dirname(base_dir))
            json_path = os.path.join(project_root, 'sisTrisakti', f'response-datakelas{program}.json')
        
        self.stdout.write(f"Looking for JSON file at: {json_path}")
        
        if not os.path.exists(json_path):
            self.stderr.write(self.style.ERROR(f"JSON file not found: {json_path}"))
            return
        
        self.stdout.write(f"Loading data from: {json_path}")
        
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self.stdout.write(f"Found {len(data)} courses in JSON file")
        
        # Counters
        courses_created = 0
        courses_updated = 0
        lecturers_created = 0
        lecturers_updated = 0
        students_created = 0
        classes_created = 0
        classes_updated = 0
        enrollments_created = 0
        class_lecturers_created = 0
        
        with transaction.atomic():
            for course_id, course_data in data.items():
                kelas = course_data.get('kelas', {})
                dosen = course_data.get('dosen', {})
                students = course_data.get('Std', [])
                
                # 1. Create/Update Course
                course, created = SisCourse.objects.update_or_create(
                    id=kelas.get('IdCourse', course_id),
                    defaults={
                        'code': kelas.get('KodeMk', ''),
                        'name': kelas.get('Matakuliah', ''),
                        'program': program,
                    }
                )
                if created:
                    courses_created += 1
                else:
                    courses_updated += 1
                
                # 2. Create/Update Course Class
                class_code = kelas.get('KodeKelas', '01')
                class_id = f"{course.id}_{class_code}"
                
                # Parse time
                start_time = None
                end_time = None
                try:
                    if kelas.get('mulai'):
                        start_time = datetime.strptime(kelas.get('mulai'), '%H:%M:%S').time()
                    if kelas.get('selesai'):
                        end_time = datetime.strptime(kelas.get('selesai'), '%H:%M:%S').time()
                except ValueError:
                    pass
                
                course_class, created = SisCourseClass.objects.update_or_create(
                    id=class_id,
                    defaults={
                        'course': course,
                        'class_code': class_code,
                        'room': kelas.get('KodeRuang', ''),
                        'day': kelas.get('hari', ''),
                        'start_time': start_time,
                        'end_time': end_time,
                    }
                )
                if created:
                    classes_created += 1
                else:
                    classes_updated += 1
                
                # 3. Create/Update Lecturers and link to class
                current_lecturer_ids = set()
                for lecturer_key, lecturer_data in dosen.items():
                    # Handle case where lecturer_data is not a dict
                    if not isinstance(lecturer_data, dict):
                        continue
                    
                    staff_id = str(lecturer_data.get('StaffId', lecturer_key))
                    
                    lecturer, created = SisLecturer.objects.update_or_create(
                        id=staff_id,
                        defaults={
                            'id_staff': lecturer_data.get('IdStaff'),
                            'name': lecturer_data.get('StaffName', '') or '',
                            'photo_url': lecturer_data.get('photo', '') or '',
                        }
                    )
                    current_lecturer_ids.add(lecturer.id)
                    if created:
                        lecturers_created += 1
                    else:
                        lecturers_updated += 1
                    
                    # Link lecturer to course class
                    _, created = SisCourseClassLecturer.objects.get_or_create(
                        course_class=course_class,
                        lecturer=lecturer
                    )
                    if created:
                        class_lecturers_created += 1

                # Remove lecturers no longer linked in API for this class
                if current_lecturer_ids:
                    SisCourseClassLecturer.objects.filter(course_class=course_class).exclude(
                        lecturer_id__in=current_lecturer_ids
                    ).delete()
                else:
                    SisCourseClassLecturer.objects.filter(course_class=course_class).delete()
                
                # 4. Create Students and Enrollments
                current_student_nims = set()
                for student_data in students:
                    nim = student_data.get('nim', '')
                    if not nim:
                        continue

                    name = student_data.get('nama') or student_data.get('name') or student_data.get('NamaMhs') or ''
                    photo = student_data.get('photo') or student_data.get('foto') or student_data.get('Photo') or ''
                    
                    # Create student (include name/photo if provided)
                    student, created = SisStudent.objects.get_or_create(
                        nim=nim,
                        defaults={
                            'program': program,
                            'name': name or '',
                            'photo_url': photo or '',
                        }
                    )
                    if created:
                        students_created += 1
                    else:
                        updates = {}
                        if name and student.name != name:
                            updates['name'] = name
                        if photo and student.photo_url != photo:
                            updates['photo_url'] = photo
                        if program and student.program != program:
                            updates['program'] = program
                        if updates:
                            SisStudent.objects.filter(nim=nim).update(**updates)
                    current_student_nims.add(nim)
                    
                    # Create enrollment
                    _, created = SisEnrollment.objects.get_or_create(
                        course_class=course_class,
                        student=student
                    )
                    if created:
                        enrollments_created += 1

                # Remove enrollments no longer present in API for this class
                if current_student_nims:
                    SisEnrollment.objects.filter(course_class=course_class).exclude(
                        student_id__in=current_student_nims
                    ).delete()
                else:
                    SisEnrollment.objects.filter(course_class=course_class).delete()
        
        # Summary
        self.stdout.write(self.style.SUCCESS("\n=== Sync Complete ==="))
        self.stdout.write(f"Courses: {courses_created} created, {courses_updated} updated")
        self.stdout.write(f"Course Classes: {classes_created} created, {classes_updated} updated")
        self.stdout.write(f"Lecturers: {lecturers_created} created, {lecturers_updated} updated")
        self.stdout.write(f"Students: {students_created} created")
        self.stdout.write(f"Class-Lecturer links: {class_lecturers_created} created")
        self.stdout.write(f"Enrollments: {enrollments_created} created")
        
        # Show totals
        self.stdout.write(self.style.SUCCESS("\n=== Database Totals ==="))
        self.stdout.write(f"Total Courses: {SisCourse.objects.count()}")
        self.stdout.write(f"Total Classes: {SisCourseClass.objects.count()}")
        self.stdout.write(f"Total Lecturers: {SisLecturer.objects.count()}")
        self.stdout.write(f"Total Students: {SisStudent.objects.count()}")
        self.stdout.write(f"Total Enrollments: {SisEnrollment.objects.count()}")
