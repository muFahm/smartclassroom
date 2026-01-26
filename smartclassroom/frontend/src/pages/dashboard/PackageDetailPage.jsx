import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { quizRequest } from "../../api/quizClient";
import "./QuizPages.css";

const createDefaultQuestion = (order = 1) => ({
  body_text: "",
  explanation: "",
  question_type: "single",
  difficulty_tag: "",
  order,
  options: [
    { label: "A", body_text: "", is_correct: false },
    { label: "B", body_text: "", is_correct: false },
  ],
});

export default function PackageDetailPage() {
  const { packageId, classId } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState(createDefaultQuestion());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgRes, questionRes] = await Promise.all([
        quizRequest(`/api/quiz/packages/${packageId}/`),
        quizRequest(`/api/quiz/questions/?package=${packageId}`),
      ]);
      const pkgData = await pkgRes.json();
      const questionData = await questionRes.json();
      const list = questionData.results || questionData;
      setPkg(pkgData);
      setQuestions(list);
      setQuestionForm((prev) => ({ ...prev, order: list.length + 1 }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  const handleQuestionChange = (event) => {
    const { name, value } = event.target;
    setQuestionForm((prev) => {
      if (name === "question_type" && value === "single") {
        const firstCorrect = prev.options.findIndex((option) => option.is_correct);
        const normalizedOptions = prev.options.map((option, idx) => ({
          ...option,
          is_correct: idx === (firstCorrect === -1 ? 0 : firstCorrect),
        }));
        return { ...prev, [name]: value, options: normalizedOptions };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleOptionChange = (index, field, value) => {
    setQuestionForm((prev) => {
      const options = prev.options.map((option, idx) => (idx === index ? { ...option, [field]: value } : option));
      return { ...prev, options };
    });
  };

  const toggleCorrect = (index) => {
    setQuestionForm((prev) => {
      const options = prev.options.map((option, idx) => ({
        ...option,
        is_correct:
          prev.question_type === "single"
            ? idx === index
            : idx === index
              ? !option.is_correct
              : option.is_correct,
      }));
      return { ...prev, options };
    });
  };

  const addOption = () => {
    setQuestionForm((prev) => ({
      ...prev,
      options: [...prev.options, { label: String.fromCharCode(65 + prev.options.length), body_text: "", is_correct: false }],
    }));
  };

  const removeOption = (index) => {
    setQuestionForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== index),
    }));
  };

  const handleCreateQuestion = async (event) => {
    event.preventDefault();
    const correctCount = questionForm.options.filter((option) => option.is_correct).length;
    if (questionForm.options.length < 2) {
      setError("Setidaknya harus ada dua opsi jawaban.");
      return;
    }
    if (correctCount === 0) {
      setError("Tentukan minimal satu jawaban yang benar.");
      return;
    }
    if (questionForm.question_type === "single" && correctCount !== 1) {
      setError("Soal pilihan tunggal hanya boleh punya satu jawaban benar.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await quizRequest(`/api/quiz/questions/`, {
        method: "POST",
        body: JSON.stringify({ ...questionForm, package_id: packageId }),
      });
      setQuestionForm(createDefaultQuestion(questions.length + 2));
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm("Hapus pertanyaan ini?")) return;
    try {
      await quizRequest(`/api/quiz/questions/${id}/`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const questionTypeOptions = useMemo(
    () => [
      { value: "single", label: "Pilihan Tunggal" },
      { value: "multiple", label: "Pilihan Ganda" },
      { value: "truefalse", label: "Benar/Salah" },
    ],
    []
  );

  if (loading) {
    return <p>Memuat detail paket...</p>;
  }

  if (!pkg) {
    return <p>Paket tidak ditemukan.</p>;
  }

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <div>
          <h1>{pkg.title}</h1>
          <div className="quiz-subtitle">Detail paket kuis dan daftar pertanyaan.</div>
        </div>
        <div className="quiz-actions">
          <button
            className="quiz-button secondary"
            onClick={() => navigate(`/classoverview/${classId || "701"}/kuis`)}
          >
            Kembali
          </button>
        </div>
      </div>

      <section className="quiz-card">
        <h3>Tambah Pertanyaan</h3>
        <form className="quiz-form quiz-form--stack" onSubmit={handleCreateQuestion}>
          <label>
            Teks Pertanyaan
            <textarea name="body_text" value={questionForm.body_text} onChange={handleQuestionChange} rows={3} required />
          </label>
          <label>
            Penjelasan (opsional)
            <textarea name="explanation" value={questionForm.explanation} onChange={handleQuestionChange} rows={2} />
          </label>
          <label>
            Tingkat Kesulitan
            <input name="difficulty_tag" value={questionForm.difficulty_tag} onChange={handleQuestionChange} placeholder="Mudah/Sedang/Sulit" />
          </label>
          <label>
            Tipe Pertanyaan
            <select name="question_type" value={questionForm.question_type} onChange={handleQuestionChange}>
              {questionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="quiz-card" style={{ background: "#f9fafb" }}>
            <div className="quiz-actions" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
              <strong>Opsi Jawaban</strong>
              <button type="button" className="quiz-button secondary" onClick={addOption}>
                + Tambah Opsi
              </button>
            </div>
            {questionForm.options.map((option, index) => (
              <div key={option.label + index} className="quiz-option-row">
                <span className="quiz-pill">{option.label}</span>
                <input
                  value={option.body_text}
                  onChange={(e) => handleOptionChange(index, "body_text", e.target.value)}
                  placeholder="Isi jawaban"
                  required
                />
                <label className="quiz-option-control" htmlFor={`option-correct-${index}`}>
                  <input
                    id={`option-correct-${index}`}
                    className="quiz-option-checkbox"
                    type="checkbox"
                    checked={option.is_correct}
                    onChange={() => toggleCorrect(index)}
                  />
                  Benar
                </label>
                {questionForm.options.length > 2 && (
                  <button type="button" className="quiz-button danger" onClick={() => removeOption(index)}>
                    Hapus
                  </button>
                )}
              </div>
            ))}
          </div>
          {error && <p className="quiz-error">{error}</p>}
          <div className="quiz-submit-row">
            <button type="submit" className="quiz-button" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Pertanyaan"}
            </button>
          </div>
        </form>
      </section>

      <section className="quiz-card">
        <div className="quiz-header">
          <h3>Daftar Pertanyaan</h3>
          <div className="quiz-pill">{questions.length} soal</div>
        </div>
        {questions.length === 0 ? (
          <p>Belum ada pertanyaan.</p>
        ) : (
          <ul className="quiz-question-list">
            {questions.map((question) => (
              <li key={question.id} className="quiz-question-item">
                <div>
                  <strong>
                    #{question.order} - {question.body_text || question.question_text}
                  </strong>
                  <ul style={{ marginTop: "6px", paddingLeft: "16px" }}>
                    {question.options?.map((option) => (
                      <li key={option.id} className={`quiz-option ${option.is_correct ? "correct" : ""}`}>
                        {option.label || "-"}. {option.body_text || option.text || option.answer_text}
                      </li>
                    ))}
                  </ul>
                </div>
                <button className="quiz-button danger" onClick={() => deleteQuestion(question.id)}>
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
