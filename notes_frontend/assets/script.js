(function () {
  'use strict';

  // PUBLIC_INTERFACE
  function formatTimestamp(date) {
    /** Returns a human-readable timestamp string */
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  const els = {
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.querySelector('.sidebar-toggle'),
    newNoteBtn: document.getElementById('newNoteBtn'),
    fabNewNote: document.getElementById('fabNewNote'),
    notesList: document.getElementById('notesList'),
    notesCount: document.getElementById('notesCount'),
    noteTitle: document.getElementById('noteTitle'),
    noteContent: document.getElementById('noteContent'),
    deleteNoteBtn: document.getElementById('deleteNoteBtn'),
    timestamp: document.getElementById('timestamp'),
    search: document.getElementById('search'),
    categoryList: document.getElementById('categoryList'),
    tagCloud: document.getElementById('tagCloud'),
    editorTags: document.getElementById('editorTags'),
  };

  const STORAGE_KEY = 'ocean-notes/v1';
  let state = {
    notes: [],
    selectedId: null,
    filter: {
      search: '',
      category: 'all',
      tag: null,
    },
  };

  // Seed sample notes if none
  const SAMPLE_NOTES = [
    {
      id: cryptoRandom(),
      title: 'Book Review : The Design of Everyday Things by Don Norman',
      content: 'Affordances, signifiers, feedback – essential principles in human-centered design.\n\nKey takeaways:\n- Design for error\n- Bridge gulfs of execution and evaluation',
      tags: ['reading','design'],
      category: 'personal',
      updatedAt: new Date().toISOString(),
    },
    {
      id: cryptoRandom(),
      title: 'Animes produced by Ufotable',
      content: 'Fate/Zero, Demon Slayer, Garden of Sinners.\nVisual direction and compositing are standouts.',
      tags: ['ideas'],
      category: 'personal',
      updatedAt: new Date().toISOString(),
    },
    {
      id: cryptoRandom(),
      title: 'Mangas planned to read',
      content: 'Vagabond, Pluto, Monster, Oyasumi Punpun.',
      tags: ['todo'],
      category: 'personal',
      updatedAt: new Date().toISOString(),
    },
    {
      id: cryptoRandom(),
      title: 'Awesome tweets collection',
      content: 'Curating thoughtful threads about product, design, and engineering.',
      tags: ['learning'],
      category: 'work',
      updatedAt: new Date().toISOString(),
    },
    {
      id: cryptoRandom(),
      title: 'List of free & open source apps',
      content: 'GIMP, Inkscape, Krita, Blender, Audacity, LMMS, Scribus, LibreOffice.',
      tags: ['reading'],
      category: 'ideas',
      updatedAt: new Date().toISOString(),
    },
  ];

  function cryptoRandom() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now();
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.notes)) {
          state = { ...state, ...parsed };
          return;
        }
      }
    } catch {}
    state.notes = SAMPLE_NOTES;
    state.selectedId = state.notes[0]?.id || null;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      notes: state.notes,
      selectedId: state.selectedId,
      filter: state.filter,
    }));
  }

  function setSelected(id) {
    state.selectedId = id;
    save();
    render();
    focusEditorTitle();
  }

  function createNote() {
    const now = new Date().toISOString();
    const newNote = {
      id: cryptoRandom(),
      title: 'Untitled',
      content: '',
      tags: [],
      category: state.filter.category === 'all' ? 'personal' : state.filter.category,
      updatedAt: now,
    };
    state.notes.unshift(newNote);
    state.selectedId = newNote.id;
    save();
    render();
    focusEditorTitle();
  }

  function deleteSelected() {
    const id = state.selectedId;
    if (!id) return;
    const note = state.notes.find(n => n.id === id);
    const name = note?.title || 'this note';
    const ok = confirm(`Delete "${name}"? This cannot be undone.`);
    if (!ok) return;
    state.notes = state.notes.filter(n => n.id !== id);
    state.selectedId = state.notes[0]?.id || null;
    save();
    render();
  }

  function updateSelected(partial) {
    const idx = state.notes.findIndex(n => n.id === state.selectedId);
    if (idx === -1) return;
    state.notes[idx] = { ...state.notes[idx], ...partial, updatedAt: new Date().toISOString() };
    save();
    renderListOnly();
    updateTimestamp();
  }

  function applySearchFilter(notes) {
    const q = (state.filter.search || '').trim().toLowerCase();
    const cat = state.filter.category;
    const tag = state.filter.tag;

    return notes.filter(n => {
      const matchesQ = !q || n.title.toLowerCase().includes(q) || (n.content||'').toLowerCase().includes(q);
      const matchesCat = cat === 'all' ? true : n.category === cat;
      const matchesTag = tag ? (n.tags || []).includes(tag) : true;
      return matchesQ && matchesCat && matchesTag;
    });
  }

  function render() {
    renderList();
    renderEditor();
    updateTimestamp();
    updateCount();
  }

  function renderListOnly() {
    renderList();
    updateCount();
  }

  function renderList() {
    const list = els.notesList;
    list.innerHTML = '';
    const filtered = applySearchFilter(state.notes);
    filtered.forEach(note => {
      const li = document.createElement('li');
      li.className = 'note-item' + (note.id === state.selectedId ? ' active':'');
      li.tabIndex = 0;
      li.setAttribute('role','listitem');
      li.dataset.id = note.id;

      li.innerHTML = `
        <span class="note-bullet" aria-hidden="true"></span>
        <div class="note-body" style="min-width:0;flex:1">
          <div style="display:flex;gap:8px;align-items:center;">
            <p class="note-title" style="flex:1;min-width:0">${escapeHtml(note.title || 'Untitled')}</p>
            <span class="note-time">${formatTimestamp(note.updatedAt)}</span>
          </div>
          <p class="note-snippet">${escapeHtml((note.content || '').replace(/\n+/g,' ').trim()).slice(0,160)}</p>
        </div>
      `;

      li.addEventListener('click', () => setSelected(note.id));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(note.id); }
      });

      list.appendChild(li);
    });

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.style.padding = '16px';
      empty.textContent = 'No notes found.';
      list.appendChild(empty);
    }
  }

  function renderEditor() {
    const note = state.notes.find(n => n.id === state.selectedId);
    els.noteTitle.value = note?.title || '';
    els.noteContent.innerHTML = note?.content ? toHtml(note.content) : '';
    renderEditorTags(note);
  }

  function updateTimestamp() {
    const note = state.notes.find(n => n.id === state.selectedId);
    els.timestamp.textContent = note ? `Last edited ${formatTimestamp(note.updatedAt)}` : '';
  }

  function updateCount() {
    const filtered = applySearchFilter(state.notes);
    els.notesCount.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;
  }

  function renderEditorTags(note) {
    els.editorTags.innerHTML = '';
    if (!note) return;
    (note.tags || []).forEach(t => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = `#${t}`;
      els.editorTags.appendChild(chip);
    });
  }

  // Helpers
  function escapeHtml(s) {
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }
  function toHtml(plaintext) {
    // Simple transform: split paragraphs by blank lines, turn - list into <ul>
    const lines = String(plaintext).split('\n');
    const blocks = [];
    let inList = false;
    let listItems = [];
    for (const line of lines) {
      const l = line.trim();
      if (!l) {
        if (inList) {
          blocks.push('<ul>' + listItems.map(li => `<li>${escapeHtml(li)}</li>`).join('') + '</ul>');
          inList = false; listItems = [];
        } else {
          blocks.push('<p>&nbsp;</p>');
        }
        continue;
      }
      if (/^[-*]\s+/.test(l)) {
        inList = true;
        listItems.push(l.replace(/^[-*]\s+/, ''));
      } else {
        if (inList) {
          blocks.push('<ul>' + listItems.map(li => `<li>${escapeHtml(li)}</li>`).join('') + '</ul>');
          inList = false; listItems = [];
        }
        blocks.push('<p>' + escapeHtml(l) + '</p>');
      }
    }
    if (inList) {
      blocks.push('<ul>' + listItems.map(li => `<li>${escapeHtml(li)}</li>`).join('') + '</ul>');
    }
    return blocks.join('');
  }
  function fromHtml(el) {
    // Convert minimal HTML contenteditable to plaintext with lists
    const clone = el.cloneNode(true);
    // Replace <li> with "- text"
    clone.querySelectorAll('li').forEach(li => {
      const p = document.createElement('p');
      p.textContent = '- ' + li.textContent;
      li.replaceWith(p);
    });
    // Then paragraphs with text
    return clone.textContent.replace(/\u00A0/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  }

  // Event bindings
  function bindEvents() {
    els.newNoteBtn.addEventListener('click', createNote);
    els.fabNewNote.addEventListener('click', createNote);

    els.deleteNoteBtn.addEventListener('click', deleteSelected);

    els.noteTitle.addEventListener('input', (e) => {
      updateSelected({ title: e.currentTarget.value });
    });

    // Debounce content updates
    let contentTimer;
    const commitContent = () => {
      const text = fromHtml(els.noteContent);
      updateSelected({ content: text });
    };
    const scheduleContent = () => {
      clearTimeout(contentTimer);
      contentTimer = setTimeout(commitContent, 300);
    };
    els.noteContent.addEventListener('input', scheduleContent);
    els.noteContent.addEventListener('blur', commitContent);

    // Toolbar commands using document.execCommand for simplicity
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        try {
          if (cmd === 'bold' || cmd === 'italic' || cmd === 'underline') {
            document.execCommand(cmd, false, null);
          } else if (cmd === 'insertUnorderedList') {
            document.execCommand('insertUnorderedList', false, null);
          }
          els.noteContent.focus();
          scheduleContent();
        } catch {}
      });
    });

    // Search
    els.search.addEventListener('input', (e) => {
      state.filter.search = e.target.value || '';
      save();
      renderListOnly();
    });

    // Sidebar toggle (<=1024)
    els.sidebarToggle.addEventListener('click', () => {
      const open = !els.sidebar.classList.contains('open');
      els.sidebar.classList.toggle('open', open);
      els.sidebarToggle.setAttribute('aria-expanded', String(open));
    });

    // Category filter
    els.categoryList.querySelectorAll('.menu-item').forEach(btn => {
      btn.addEventListener('click', () => {
        els.categoryList.querySelectorAll('.menu-item').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        state.filter.category = btn.dataset.category || 'all';
        save();
        renderListOnly();
      });
    });

    // Tag filter
    els.tagCloud.querySelectorAll('.tag').forEach(tagBtn => {
      tagBtn.addEventListener('click', () => {
        const selected = state.filter.tag === tagBtn.dataset.tag ? null : tagBtn.dataset.tag;
        state.filter.tag = selected;
        // visual
        els.tagCloud.querySelectorAll('.tag').forEach(b => b.style.borderColor = 'var(--color-border)');
        if (selected) tagBtn.style.borderColor = 'var(--color-primary)';
        save();
        renderListOnly();
      });
    });

    // Keyboard deletion
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        deleteSelected();
      }
    });
  }

  function focusEditorTitle() {
    setTimeout(() => {
      els.noteTitle.focus();
      try {
        const val = els.noteTitle.value;
        els.noteTitle.setSelectionRange(val.length, val.length);
      } catch {}
    }, 60);
  }

  function init() {
    load();
    bindEvents();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
