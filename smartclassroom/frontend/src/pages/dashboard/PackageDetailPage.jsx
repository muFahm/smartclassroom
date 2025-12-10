import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../../api/client";

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
  const { packageId } = useParams();
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
        apiRequest(`/api/quiz/packages/${packageId}/`),
        apiRequest(`/api/quiz/questions/?package=${packageId}`),
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
    setQuestionForm((prev) => ({ ...prev, [name]: value }));
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
        is_correct: prev.question_type === "single" ? idx === index : idx === index ? !option.is_correct : option.is_correct,
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
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/api/quiz/questions/`, {
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
      await apiRequest(`/api/quiz/questions/${id}/`, { method: "DELETE" });
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
    <div>
      <header className="page-header">
        <div>
          <p className="muted">Paket Kuis</p>
          <h1>{pkg.title}</h1>
        </div>
      </header>

      <section className="card">
        <h2>Tambah Pertanyaan</h2>
        <form className="form" onSubmit={handleCreateQuestion}>
          <label>
            Teks Pertanyaan
            <textarea name="body_text" value={questionForm.body_text} onChange={handleQuestionChange} rows={3} required />
          </label>
          <label>
            Penjelasan (opsional)
            <textarea name="explanation" value={questionForm.explanation} onChange={handleQuestionChange} rows={2} />
          </label>
          <div className="grid two">
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
          </div>
          <div className="options-editor">
            <div className="options-header">
              <h3>Opsi Jawaban</h3>
              <button type="button" onClick={addOption} className="secondary">
                + Tambah Opsi
              </button>
            </div>
            {questionForm.options.map((option, index) => (
              <div key={option.label + index} className="option-row">
                <span className="badge">{option.label}</span>
                <input value={option.body_text} onChange={(e) => handleOptionChange(index, "body_text", e.target.value)} placeholder="Isi jawaban" required />
                <label className="checkbox">
                  <input type="checkbox" checked={option.is_correct} onChange={() => toggleCorrect(index)} /> Jawaban benar
                </label>
                {questionForm.options.length > 2 && (
                  <button type="button" className="danger" onClick={() => removeOption(index)}>
                    Hapus
                  </button>
                )}
              </div>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Pertanyaan"}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Daftar Pertanyaan</h2>
          <span className="pill">{questions.length} soal</span>
        </div>
        {questions.length === 0 ? (
          <p>Belum ada pertanyaan.</p>
        ) : (
          <ul className="question-list">
            {questions.map((question) => (
              <li key={question.id}>
                <div>
                  <strong>
                    #{question.order} - {question.body_text}
                  </strong>
                  <ul>
                    {question.options.map((option) => (
                      <li key={option.id}>
                        <span className={option.is_correct ? "correct" : "muted"}>{option.label}. {option.body_text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button className="danger" onClick={() => deleteQuestion(question.id)}>
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
