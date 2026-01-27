# Generated manually

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('quiz_quizzes', '0001_initial'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='quizquestion',
            unique_together=set(),
        ),
    ]
