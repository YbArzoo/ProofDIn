import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CandidateSidebar from '../components/CandidateSidebar'; // ✅ IMPORT
import '../styles/Skills.css'; 

const Skills = () => {
  // 1. Initial State
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Add Skill Form State
  const [newSkill, setNewSkill] = useState({
    name: '',
    level: 'beginner',
    category: 'technical',
    lastUsed: new Date().toISOString().slice(0, 7)
  });

  // 3. Edit Skill Form State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    level: 'beginner',
    category: 'technical',
    lastUsed: ''
  });

  // 4. Filter State
  const [filters, setFilters] = useState({
    search: '',
    level: '',
    category: ''
  });

  // 5. Proof Modal State
  const [showProofModal, setShowProofModal] = useState(false);
  const [activeSkillId, setActiveSkillId] = useState(null);
  const [proofInputType, setProofInputType] = useState('url'); 
  const [proofForm, setProofForm] = useState({
    type: 'certificate',
    text: '',
    url: '',
    file: null 
  });

  // 6. Alert State
  const [alert, setAlert] = useState(null);

  // --- API HELPER ---
  const getAuthHeader = () => ({ 
    'x-auth-token': localStorage.getItem('token'), 
    'Content-Type': 'application/json' 
  });

  // --- FETCH SKILLS ---
  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/candidate/skills', {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      if (!res.ok) throw new Error('Failed to fetch skills');
      const data = await res.json();
      setSkills(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---

  const handleAddSkill = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/candidate/skills', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(newSkill)
      });
      
      if (res.ok) {
        const savedSkill = await res.json();
        setSkills([savedSkill, ...skills]);
        setNewSkill({ ...newSkill, name: '' }); 
        showAlert('Skill added successfully!');
      } else {
        showAlert('Failed to add skill', 'danger');
      }
    } catch (err) {
      showAlert('Error adding skill', 'danger');
    }
  };

  const handleDeleteSkill = async (id) => {
    if (!window.confirm('Are you sure you want to delete this skill?')) return;
    try {
      const res = await fetch(`/api/candidate/skills/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (res.ok) {
        setSkills(skills.filter(s => s._id !== id));
        showAlert('Skill deleted successfully!');
      }
    } catch (err) {
      showAlert('Error deleting skill', 'danger');
    }
  };

  // --- EDIT HANDLERS ---
  const handleEditClick = (skill) => {
    setEditingSkill(skill);
    setEditForm({
      name: skill.name,
      level: skill.level,
      category: skill.category,
      lastUsed: skill.lastUsed || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateSkill = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/candidate/skills/${editingSkill._id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        const updatedSkill = await res.json();
        setSkills(skills.map(s => s._id === editingSkill._id ? updatedSkill : s));
        setShowEditModal(false);
        setEditingSkill(null);
        showAlert('Skill updated successfully!');
      } else {
        showAlert('Failed to update skill', 'danger');
      }
    } catch (err) {
      showAlert('Error updating skill', 'danger');
    }
  };

  // --- PROOF HANDLER ---
  const handleSaveProof = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('text', proofForm.text);
    
    if (proofInputType === 'file' && proofForm.file) {
       formData.append('file', proofForm.file); 
       formData.append('type', 'file');
    } else {
       formData.append('url', proofForm.url);
       formData.append('type', proofForm.type);
    }

    try {
      const res = await fetch(`/api/candidate/skills/${activeSkillId}/proof`, {
        method: 'POST',
        headers: { 'x-auth-token': localStorage.getItem('token') },
        body: formData
      });

      if (res.ok) {
        const updatedSkill = await res.json();
        setSkills(skills.map(s => s._id === activeSkillId ? updatedSkill : s));
        setShowProofModal(false);
        showAlert('Certification added successfully!');
      } else {
        showAlert('Failed to upload proof', 'danger');
      }
    } catch (err) {
      showAlert('Error adding proof', 'danger');
    }
  };

  // --- DELETE PROOF ---
  const handleDeleteProof = async (skillId, proofId) => {
    if (!window.confirm('Remove this proof?')) return;
    
    try {
      const res = await fetch(`/api/candidate/skills/${skillId}/proof/${proofId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (res.ok) {
        const updatedSkill = await res.json();
        setSkills(skills.map(s => s._id === skillId ? updatedSkill : s));
        showAlert('Proof removed successfully');
      } else {
        showAlert('Failed to remove proof', 'danger');
      }
    } catch (err) {
      showAlert('Error removing proof', 'danger');
    }
  };

  // --- HELPERS ---
  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const formatMonth = (monthString) => {
    if (!monthString) return '';
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getProofIcon = (type) => {
    const icons = { github: 'fab fa-github', portfolio: 'fas fa-globe', certificate: 'fas fa-certificate', link: 'fas fa-link', file: 'fas fa-file-alt' };
    return icons[type] || 'fas fa-link';
  };
  
  const handleLogout = () => { localStorage.clear(); window.location.href = '/'; };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setProofForm({ ...proofForm, file: file, url: objectUrl, text: proofForm.text || file.name });
    }
  };

  // --- DERIVED DATA ---
  const filteredSkills = useMemo(() => {
    return skills.filter(skill => {
      const matchesSearch = skill.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchesLevel = !filters.level || skill.level === filters.level;
      const matchesCategory = !filters.category || skill.category === filters.category;
      return matchesSearch && matchesLevel && matchesCategory;
    });
  }, [skills, filters]);

  const stats = useMemo(() => {
    return {
      total: skills.length,
      expert: skills.filter(s => s.level === 'expert').length,
      certified: skills.filter(s => s.proofs && s.proofs.length > 0).length
    };
  }, [skills]);

  return (
    <div>
      {/* ✅ REPLACED SIDEBAR */}
      <CandidateSidebar />

      <header className="dashboard-header">
        <nav className="dashboard-nav">
          <div className="user-menu">
            <div className="user-profile"><div className="avatar">C</div><div><div style={{ fontWeight: 600 }}>Candidate</div><div style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>Profile</div></div></div>
            <button className="btn btn-primary" onClick={handleLogout} style={{ width: 'auto', display: 'inline-flex' }}><i className="fas fa-sign-out-alt"></i> Logout</button>
          </div>
        </nav>
      </header>

      <div className="dashboard-container" style={{ marginTop: 0 }}>
        <div className="page-header"><h1 className="page-title"><i className="fas fa-star" style={{ color: 'var(--primary)' }}></i> My Skills</h1><p className="page-subtitle">Track, showcase, and certify your professional skills</p></div>

        {alert && <div className={`alert alert-${alert.type}`}><i className={`fas fa-${alert.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i><span>{alert.message}</span><i className="fas fa-times" style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => setAlert(null)}></i></div>}

        {/* Stats */}
        <div className="stats-container">
          <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Skills</div></div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' }}><div className="stat-value">{stats.expert}</div><div className="stat-label">Expert Level</div></div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)' }}><div className="stat-value">{stats.certified}</div><div className="stat-label">With Certification</div></div>
        </div>

        {/* Add Skill Form */}
        <div className="skills-section">
          <div className="section-header"><h2 className="section-title"><i className="fas fa-plus-circle"></i> Add New Skill</h2></div>
          <form className="add-skill-form" onSubmit={handleAddSkill}>
            <div className="form-group"><label htmlFor="skillName">Skill Name</label><input type="text" id="skillName" placeholder="e.g., React, Python" value={newSkill.name} onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })} required /></div>
            <div className="form-group"><label htmlFor="skillLevel">Level</label><select id="skillLevel" value={newSkill.level} onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value })} required><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></div>
            <div className="form-group"><label htmlFor="skillCategory">Category</label><select id="skillCategory" value={newSkill.category} onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })} required><option value="technical">Technical</option><option value="soft">Soft Skills</option><option value="tools">Tools & Platforms</option><option value="other">Other</option></select></div>
            <div className="form-group"><label htmlFor="lastUsed">Last Used</label><input type="month" id="lastUsed" value={newSkill.lastUsed} onChange={(e) => setNewSkill({ ...newSkill, lastUsed: e.target.value })} required /></div>
            <button type="submit" className="btn btn-primary"><i className="fas fa-plus"></i> Add Skill</button>
          </form>
        </div>

        {/* Skills List */}
        <div className="skills-section">
          <div className="section-header"><h2 className="section-title"><i className="fas fa-th-large"></i> Your Skills</h2></div>
          <div className="skills-grid">
            {loading ? <div style={{gridColumn: '1/-1', textAlign: 'center'}}>Loading skills...</div> : 
             filteredSkills.length > 0 ? (
              filteredSkills.map((skill) => (
                <div className="skill-card" key={skill._id || skill.id}>
                  <div className="skill-header"><div className="skill-name">{skill.name}</div><span className={`skill-level-badge skill-level-${skill.level}`}>{skill.level}</span></div>
                  <div className="skill-meta"><div className="meta-item"><i className="fas fa-tag"></i><span>{skill.category}</span></div><div className="meta-item"><i className="fas fa-calendar"></i><span>Last used: {formatMonth(skill.lastUsed)}</span></div></div>
                  {/* Proofs Display */}
                  {skill.proofs && skill.proofs.length > 0 && (
                    <div className="skill-proofs">
                      <div className="proof-title"><i className="fas fa-check"></i> Certifications ({skill.proofs.length})</div>
                      <div className="proof-links">
                        {skill.proofs.map((proof, idx) => (
                          <div key={proof._id || idx} style={{ display: 'inline-flex', alignItems: 'center', marginRight: '5px' }}>
                            <a 
                              href={proof.url} 
                              className="proof-link" 
                              title={proof.text} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ borderRadius: '4px 0 0 4px', marginRight: '0' }}
                            >
                              <i className={getProofIcon(proof.type)}></i> {proof.text}
                            </a>
                            <button
                              onClick={() => handleDeleteProof(skill._id, proof._id)}
                              style={{
                                background: '#ffe6e6',
                                border: '1px solid #e0e0e0',
                                borderLeft: 'none',
                                borderRadius: '0 4px 4px 0',
                                cursor: 'pointer',
                                color: '#dc3545',
                                padding: '0.3rem 0.5rem',
                                fontSize: '0.8rem',
                                height: '100%' 
                              }}
                              title="Remove proof"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="skill-actions">
                    <button className="skill-action-btn" onClick={() => handleEditClick(skill)}><i className="fas fa-edit"></i> Edit</button>
                    <button className="skill-action-btn" onClick={() => { setActiveSkillId(skill._id); setProofInputType('url'); setProofForm({ type: 'certificate', text: '', url: '', file: null }); setShowProofModal(true); }}><i className="fas fa-link"></i> Add Cert</button>
                    <button className="skill-action-btn delete-btn" onClick={() => handleDeleteSkill(skill._id)}><i className="fas fa-trash"></i> Delete</button>
                  </div>
                </div>
              ))
            ) : (<div className="empty-state" style={{ gridColumn: '1 / -1' }}><i className="fas fa-lightbulb"></i><h3>No Skills Found</h3><p>Start by adding your first skill above.</p></div>)}
          </div>
        </div>

        {/* --- ADD PROOF MODAL --- */}
        {showProofModal && (
          <div className="modal-overlay" onClick={() => setShowProofModal(false)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Add Certification / Proof</h3><button className="close-modal" onClick={() => setShowProofModal(false)}>&times;</button></div>
              <div className="modal-body">
                <form onSubmit={handleSaveProof}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{marginBottom: '0.5rem', display: 'block'}}>Evidence Source</label>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button type="button" className="btn" style={{backgroundColor: proofInputType === 'url' ? 'var(--primary)' : 'var(--light)', color: proofInputType === 'url' ? 'white' : 'var(--dark)', border: '1px solid #e0e0e0', flex: 1}} onClick={() => setProofInputType('url')}><i className="fas fa-link"></i> Link (URL)</button>
                      <button type="button" className="btn" style={{backgroundColor: proofInputType === 'file' ? 'var(--primary)' : 'var(--light)', color: proofInputType === 'file' ? 'white' : 'var(--dark)', border: '1px solid #e0e0e0', flex: 1}} onClick={() => setProofInputType('file')}><i className="fas fa-upload"></i> Upload File</button>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}><label>Description / Title</label><input type="text" placeholder={proofInputType === 'file' ? "e.g., Certificate.pdf" : "e.g., AWS Certificate"} value={proofForm.text} onChange={(e) => setProofForm({...proofForm, text: e.target.value})} required /></div>
                  {proofInputType === 'url' ? (<><div className="form-group" style={{ marginBottom: '1rem' }}><label>Type</label><select value={proofForm.type} onChange={(e) => setProofForm({...proofForm, type: e.target.value})}><option value="certificate">Certificate</option><option value="github">GitHub Link</option><option value="portfolio">Portfolio Project</option><option value="link">Other Link</option></select></div><div className="form-group" style={{ marginBottom: '1.5rem' }}><label>URL</label><input type="url" placeholder="https://..." value={proofForm.url} onChange={(e) => setProofForm({...proofForm, url: e.target.value})} required /></div></>) : (<div className="form-group" style={{ marginBottom: '1.5rem' }}><label>Select File</label><input type="file" accept="image/*,.pdf" onChange={handleFileChange} required={!proofForm.file} style={{ padding: '0.5rem', border: '1px dashed #ccc' }} /><small style={{color: 'var(--secondary)', marginTop: '5px'}}>Supports Images and PDF</small></div>)}
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}><button type="button" className="btn btn-secondary" onClick={() => setShowProofModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save Proof</button></div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* --- EDIT SKILL MODAL --- */}
        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Edit Skill</h3><button className="close-modal" onClick={() => setShowEditModal(false)}>&times;</button></div>
              <div className="modal-body">
                <form onSubmit={handleUpdateSkill}>
                  <div className="form-group" style={{marginBottom: '1rem'}}><label>Skill Name</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
                  <div className="form-group" style={{marginBottom: '1rem'}}><label>Level</label><select value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: e.target.value })} required><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></div>
                  <div className="form-group" style={{marginBottom: '1rem'}}><label>Category</label><select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} required><option value="technical">Technical</option><option value="soft">Soft Skills</option><option value="tools">Tools & Platforms</option><option value="other">Other</option></select></div>
                  <div className="form-group" style={{marginBottom: '1.5rem'}}><label>Last Used</label><input type="month" value={editForm.lastUsed} onChange={(e) => setEditForm({ ...editForm, lastUsed: e.target.value })} required /></div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}><button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Update Skill</button></div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Skills;