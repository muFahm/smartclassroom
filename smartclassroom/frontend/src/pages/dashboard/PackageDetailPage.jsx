import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { quizRequest } from "../../api/quizClient";
import "./QuizPages.css";

const createDefaultQuestion = (order = 1, type = "multiple") => {
  if (type === "truefalse") {
    return {
      body_text: "",
      media_url: "",
      question_type: "truefalse",
      order,
      options: [
        { label: "A", body_text: "True", is_correct: false },
        { label: "B", body_text: "False", is_correct: false },
      ],
    };
  }
  return {
    body_text: "",
    media_url: "",
    question_type: type,
    order,
    options: [
      { label: "A", body_text: "", is_correct: false },
      { label: "B", body_text: "", is_correct: false },
    ],
  };
};

export default function PackageDetailPage() {
  const { packageId, classId } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState(createDefaultQuestion());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [pkgRes, questionRes] = await Promise.all([
        quizRequest(`/api/quiz/packages/${packageId}/`),
        quizRequest(`/api/quiz/questions/?package=${packageId}`),
      ]);
      const pkgData = await pkgRes.json();
      const questionData = await questionRes.json();
      const list = questionData.results || questionData;
      
      console.log("📋 Loaded questions for package", packageId, ":", list.length, "questions");
      if (list.length > 0) {
        console.log("📄 Sample question data:", list[0]);
      }
      
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
    // Cleanup function untuk cancel any pending operations
    let isMounted = true;
    
    const loadDataForPackage = async () => {
      // Reset state saat packageId berubah
      setQuestions([]);
      setQuestionForm(createDefaultQuestion());
      setSelectedQuestion(null);
      setError("");
      setPkg(null);
      setLoading(true);
      
      try {
        const [pkgRes, questionRes] = await Promise.all([
          quizRequest(`/api/quiz/packages/${packageId}/`),
          quizRequest(`/api/quiz/questions/?package=${packageId}`),
        ]);
        
        if (!isMounted) return; // Component unmounted, don't update state
        
        const pkgData = await pkgRes.json();
        const questionData = await questionRes.json();
        const list = questionData.results || questionData;
        
        setPkg(pkgData);
        setQuestions(list);
        setQuestionForm((prev) => ({ ...prev, order: list.length + 1 }));
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadDataForPackage();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  const handleQuestionChange = (event) => {
    const { name, value } = event.target;
    setQuestionForm((prev) => {
      if (name === "question_type") {
        // Switch tipe: reset form dengan default baru
        if (value === "truefalse") {
          return createDefaultQuestion(prev.order, "truefalse");
        } else if (prev.question_type === "truefalse") {
          // Dari T/F ke MC: reset ke 2 opsi kosong
          return createDefaultQuestion(prev.order, value);
        } else {
          // Pilihan Ganda: normalize ke hanya 1 benar
          const firstCorrect = prev.options.findIndex((option) => option.is_correct);
          const normalizedOptions = prev.options.map((option, idx) => ({
            ...option,
            is_correct: idx === (firstCorrect === -1 ? 0 : firstCorrect),
          }));
          return { ...prev, question_type: value, options: normalizedOptions };
        }
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
        // Pilihan Ganda: hanya 1 benar (behavior seperti radio)
        is_correct: idx === index,
      }));
      return { ...prev, options };
    });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validasi tipe file
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Tipe file tidak didukung. Gunakan JPEG, PNG, GIF, atau WebP.");
      return;
    }

    // Validasi ukuran (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file terlalu besar. Maksimal 5MB.");
      return;
    }

    setUploadingImage(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await quizRequest("/api/quiz/media/upload_image/", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log("✅ Upload berhasil, URL:", data.url);
        setQuestionForm((prev) => ({ ...prev, media_url: data.url }));
      } else {
        setError(data.error || "Gagal upload gambar.");
      }
    } catch (err) {
      setError("Gagal upload gambar: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const addOption = () => {
    if (questionForm.options.length >= 4) {
      setError("Maksimal 4 opsi untuk polling device.");
      return;
    }
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
    
    if (questionForm.options.length > 4) {
      setError("Maksimal 4 opsi untuk polling device.");
      return;
    }
    if (questionForm.question_type === "truefalse" && questionForm.options.length !== 2) {
      setError("Soal True/False harus memiliki tepat 2 opsi.");
      return;
    }
    if (questionForm.question_type !== "truefalse" && questionForm.options.length < 2) {
      setError("Setidaknya harus ada dua opsi jawaban.");
      return;
    }
    if (correctCount === 0) {
      setError("Tentukan minimal satu jawaban yang benar.");
      return;
    }
    if (correctCount !== 1) {
      setError("Hanya boleh ada satu jawaban yang benar.");
      return;
    }
    
    setSaving(true);
    setError("");
    try {
      const payload = { ...questionForm, package_id: packageId };
      console.log("📤 Submitting question:", {
        body_text: payload.body_text,
        question_type: payload.question_type,
        media_url: payload.media_url,
        has_media_url: !!payload.media_url,
        options_count: payload.options.length
      });
      
      await quizRequest(`/api/quiz/questions/`, {
        method: "POST",
        body: JSON.stringify(payload),
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
          <button className="quiz-button secondary" onClick={() => setShowBankModal(true)}>
            📚 Ambil dari Bank Soal
          </button>
          <button
            className="quiz-button secondary"
            onClick={() =>
              navigate(`/classoverview/${classId || "701"}/dashboard/kuis`)
            }
          >
            Kembali
          </button>
        </div>
      </div>

      {/* 2-pane layout */}
      <div className="quiz-builder-panes">
        {/* Left pane: Editor/Preview */}
        <section className="quiz-pane quiz-pane-left">
          {selectedQuestion ? (
            <QuestionPreview question={selectedQuestion} onClose={() => setSelectedQuestion(null)} />
          ) : (
            <div className="quiz-card">
              <h3>Tambah Pertanyaan Baru</h3>
              <form className="quiz-form quiz-form--stack" onSubmit={handleCreateQuestion}>
                <label>
                  Teks Pertanyaan
                  <textarea name="body_text" value={questionForm.body_text} onChange={handleQuestionChange} rows={3} required />
                </label>
                
                <div style={{ marginBottom: "16px" }}>
                  <strong style={{ display: "block", marginBottom: "8px" }}>Gambar (opsional)</strong>
                  
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    <span style={{ display: "block", marginBottom: "4px", fontSize: "0.9em", color: "#666" }}>Upload dari komputer</span>
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      style={{ width: "100%" }}
                    />
                  </label>
                  
                  <div style={{ textAlign: "center", margin: "8px 0", color: "#999", fontSize: "0.9em" }}>atau</div>
                  
                  <label>
                    <span style={{ display: "block", marginBottom: "4px", fontSize: "0.9em", color: "#666" }}>URL gambar dari web</span>
                    <input 
                      type="url" 
                      name="media_url" 
                      value={questionForm.media_url} 
                      onChange={handleQuestionChange} 
                      placeholder="https://example.com/image.jpg"
                      disabled={uploadingImage}
                    />
                  </label>
                  
                  {uploadingImage && (
                    <div style={{ marginTop: "8px", color: "#3b82f6", fontSize: "0.9em" }}>
                      Mengupload gambar...
                    </div>
                  )}
                  
                  {questionForm.media_url && !uploadingImage && (
                    <div style={{ marginTop: "8px" }}>
                      <img 
                        src={questionForm.media_url} 
                        alt="Preview" 
                        style={{ maxWidth: "300px", maxHeight: "200px", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
                
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
                
                {questionForm.question_type === "truefalse" ? (
                  <div className="quiz-card" style={{ background: "#f0f9ff", padding: "12px" }}>
                    <strong>Pilih jawaban yang benar:</strong>
                    <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          checked={questionForm.options[0]?.is_correct}
                          onChange={() => {
                            setQuestionForm((prev) => ({
                              ...prev,
                              options: [
                                { ...prev.options[0], is_correct: true },
                                { ...prev.options[1], is_correct: false },
                              ],
                            }));
                          }}
                        />
                        <span className="quiz-pill">A</span> True
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          checked={questionForm.options[1]?.is_correct}
                          onChange={() => {
                            setQuestionForm((prev) => ({
                              ...prev,
                              options: [
                                { ...prev.options[0], is_correct: false },
                                { ...prev.options[1], is_correct: true },
                              ],
                            }));
                          }}
                        />
                        <span className="quiz-pill">B</span> False
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="quiz-card" style={{ background: "#f9fafb" }}>
                    <div className="quiz-actions" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong>Opsi Jawaban (Max 4 untuk polling device)</strong>
                      {questionForm.options.length < 4 && (
                        <button type="button" className="quiz-button secondary" onClick={addOption}>
                          + Tambah Opsi
                        </button>
                      )}
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
                )}
                {error && <p className="quiz-error">{error}</p>}
                <div className="quiz-submit-row">
                  <button type="submit" className="quiz-button" disabled={saving}>
                    {saving ? "Menyimpan..." : "Simpan Pertanyaan"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* Right pane: Question list */}
        <section className="quiz-pane quiz-pane-right">
          <div className="quiz-card">
            <div className="quiz-header">
              <h3>Daftar Pertanyaan</h3>
              <div className="quiz-pill">{questions.length} soal</div>
            </div>
            {questions.length === 0 ? (
              <p>Belum ada pertanyaan.</p>
            ) : (
              <ul className="quiz-question-list">
                {questions.map((question) => (
                  <li
                    key={question.id}
                    className={`quiz-question-item ${selectedQuestion?.id === question.id ? "active" : ""}`}
                    onClick={() => setSelectedQuestion(question)}
                  >
                    <div>
                      <strong>
                        #{question.order} - {question.body_text.substring(0, 60)}
                        {question.body_text.length > 60 ? "..." : ""}
                        {question.media_url && " 🖼️"}
                      </strong>
                      <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "4px" }}>
                        {question.question_type === "multiple" && "Pilihan Ganda"}
                        {question.question_type === "truefalse" && "Benar/Salah"}
                        {" · "}
                        {question.options?.length || 0} opsi
                      </div>
                    </div>
                    <button className="quiz-button danger" onClick={(e) => { e.stopPropagation(); deleteQuestion(question.id); }}>
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {showBankModal && (
        <QuestionBankModal
          packageId={packageId}
          onClose={() => setShowBankModal(false)}
          onAdded={loadData}
        />
      )}
    </div>
  );
}

// Komponen preview pertanyaan di pane kiri
function QuestionPreview({ question, onClose }) {
  // Debug: log question data
  console.log("🔍 Preview question:", {
    id: question.id,
    order: question.order,
    body_text: question.body_text,
    media_url: question.media_url,
    has_media: !!question.media_url
  });
  
  return (
    <div className="quiz-card">
      <div className="quiz-header">
        <h3>Preview Pertanyaan #{question.order}</h3>
        <button className="quiz-button secondary" onClick={onClose}>
          Tutup
        </button>
      </div>
      <div style={{ marginTop: "16px" }}>
        <strong>Teks Pertanyaan:</strong>
        <p>{question.body_text}</p>
        {question.media_url && (
          <>
            <strong>Gambar:</strong>
            <div style={{ marginTop: "8px", marginBottom: "12px" }}>
              <img 
                src={question.media_url} 
                alt="Gambar soal" 
                style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", border: "1px solid #e5e7eb", display: "block" }}
                onError={(e) => { 
                  console.error("Failed to load image:", question.media_url);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <p style={{ display: "none", color: "#999", fontSize: "0.9em", fontStyle: "italic", marginTop: "8px" }}>
                Gambar tidak dapat dimuat
              </p>
            </div>
          </>
        )}
        <strong>Tipe:</strong>
        <p>
          {question.question_type === "multiple" && "Pilihan Ganda"}
          {question.question_type === "truefalse" && "Benar/Salah"}
        </p>
        <strong>Opsi Jawaban:</strong>
        <ul style={{ marginTop: "8px", paddingLeft: "16px" }}>
          {question.options?.map((option) => (
            <li key={option.id} className={`quiz-option ${option.is_correct ? "correct" : ""}`}>
              <span className="quiz-pill">{option.label}</span> {option.body_text}
              {option.is_correct && <strong> ✓ Benar</strong>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Modal Question Bank
function QuestionBankModal({ packageId, onClose, onAdded }) {
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBank = async () => {
    setLoading(true);
    try {
      const res = await quizRequest("/api/quiz/question-bank/");
      const data = await res.json();
      setBankQuestions(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = useMemo(() => {
    if (!search.trim()) return bankQuestions;
    const lower = search.toLowerCase();
    return bankQuestions.filter(
      (q) =>
        q.body_text.toLowerCase().includes(lower) ||
        q.explanation?.toLowerCase().includes(lower) ||
        q.difficulty_tag?.toLowerCase().includes(lower)
    );
  }, [bankQuestions, search]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCopySelected = async () => {
    if (selectedIds.length === 0) {
      setError("Pilih minimal satu pertanyaan.");
      return;
    }
    setCopying(true);
    setError("");
    try {
      await Promise.all(
        selectedIds.map((qId) =>
          quizRequest(`/api/quiz/question-bank/${qId}/copy_to_package/`, {
            method: "POST",
            body: JSON.stringify({ target_package_id: packageId }),
          })
        )
      );
      onAdded();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="quiz-modal-overlay" onClick={onClose}>
      <div className="quiz-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="quiz-header">
          <h2>Bank Soal</h2>
          <button className="quiz-button secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div style={{ marginTop: "16px" }}>
          <input
            type="text"
            placeholder="Cari pertanyaan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
          />
        </div>
        {loading ? (
          <p>Memuat bank soal...</p>
        ) : (
          <div className="quiz-bank-list">
            {filteredQuestions.length === 0 ? (
              <p>Tidak ada pertanyaan ditemukan.</p>
            ) : (
              filteredQuestions.map((q) => (
                <div key={q.id} className="quiz-bank-item">
                  <label style={{ display: "flex", gap: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(q.id)}
                      onChange={() => toggleSelect(q.id)}
                    />
                    <div style={{ flex: 1 }}>
                      <strong>{q.body_text.substring(0, 100)}{q.body_text.length > 100 ? "..." : ""} {q.media_url && "🖼️"}</strong>
                      <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "4px" }}>
                        {q.question_type === "multiple" && "Pilihan Ganda"}
                        {q.question_type === "truefalse" && "Benar/Salah"}
                        {" · "}
                        {q.options?.length || 0} opsi
                      </div>
                      {q.media_url && (
                        <div style={{ marginTop: "8px" }}>
                          <img 
                            src={q.media_url} 
                            alt="Preview" 
                            style={{ maxWidth: "200px", maxHeight: "150px", borderRadius: "6px", border: "1px solid #e5e7eb" }}
                          />
                        </div>
                      )}
                      <div style={{ marginTop: "6px", fontSize: "0.9rem" }}>
                        {q.options?.map((opt) => (
                          <div key={opt.id} style={{ paddingLeft: "8px" }}>
                            <span className="quiz-pill">{opt.label}</span> {opt.body_text}
                            {opt.is_correct && " ✓"}
                          </div>
                        ))}
                      </div>
                    </div>
                  </label>
                </div>
              ))
            )}
          </div>
        )}
        {error && <p className="quiz-error">{error}</p>}
        <div className="quiz-actions" style={{ marginTop: "16px", justifyContent: "flex-end" }}>
          <button className="quiz-button" onClick={handleCopySelected} disabled={copying || selectedIds.length === 0}>
            {copying ? "Menyalin..." : `Tambahkan ${selectedIds.length} soal ke paket`}
          </button>
        </div>
      </div>
    </div>
  );
}
