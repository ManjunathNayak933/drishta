'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { uploadFile } from '@/lib/api';

const CATEGORIES = ['Politics','Infrastructure','Accountability','Elections','Development','Health','Education','Economy'];

export default function ArticleEditor() {
  const { id } = useParams();
  const router = useRouter();
  const isNew = id === 'new';

  const [form, setForm] = useState({
    title: '',
    subheadline: '',
    category: '',
    author_name: '',
    cover_image_url: '',
  });
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(!isNew);
  const [coverPreview, setCoverPreview] = useState(null);

  // Tagged politicians
  const [taggedPoliticians, setTaggedPoliticians] = useState([]); // [{id, name, level, state, party}]
  const [tagSearch, setTagSearch] = useState('');
  const [tagResults, setTagResults] = useState([]);
  const [tagSearching, setTagSearching] = useState(false);

  async function searchPoliticians(q) {
    setTagSearch(q);
    if (q.length < 2) { setTagResults([]); return; }
    setTagSearching(true);
    try {
      const res = await fetch(`/api/search-politicians?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setTagResults(data.politicians ?? []);
    } catch { setTagResults([]); }
    finally { setTagSearching(false); }
  }

  function tagPolitician(pol) {
    if (!taggedPoliticians.find(p => p.id === pol.id)) {
      setTaggedPoliticians(prev => [...prev, pol]);
    }
    setTagSearch(''); setTagResults([]);
  }

  function untagPolitician(id) {
    setTaggedPoliticians(prev => prev.filter(p => p.id !== id));
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image.configure({ allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Start writing your article…' }),
    ],
    editorProps: {
      attributes: { class: 'article-editor-content focus:outline-none' },
    },
  });

  // Load existing article when editing
  useEffect(() => {
    if (isNew || !editor) return;
    async function loadArticle() {
      try {
        const { getArticleById } = await import('@/lib/api');
        const article = await getArticleById(id);
        setForm({
          title: article.title ?? '',
          subheadline: article.subheadline ?? '',
          category: article.category ?? '',
          author_name: article.author_name ?? '',
          cover_image_url: article.cover_image_url ?? '',
        });
        setStatus(article.status ?? 'draft');
        if (article.cover_image_url) setCoverPreview(article.cover_image_url);
        if (article.body_html && editor) {
          editor.commands.setContent(article.body_html);
        }
        // Load tagged politicians
        if (article.politician_ids?.length > 0) {
          const { supabase } = await import('@/lib/supabase');
          const { data: pols } = await supabase
            .from('politicians')
            .select('id, name, level, state, party')
            .in('id', article.politician_ids);
          if (pols) setTaggedPoliticians(pols);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingArticle(false);
      }
    }
    loadArticle();
  }, [isNew, id, editor]);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  if (loadingArticle) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#3a3a3a] text-sm">Loading article…</div>
      </div>
    );
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile('uploads', `articles/${Date.now()}-${file.name}`, file);
    setForm((f) => ({ ...f, cover_image_url: url }));
    setCoverPreview(url);
  }

  async function handleSave(publish = false) {
    setSaving(true);
    try {
      const body     = editor?.getHTML() ?? '';
      const bodyText = editor?.getText() ?? '';
      const excerpt  = bodyText.slice(0, 200);

      // Get current user session
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      if (!session) { alert('You are not signed in.'); return; }

      // Get channel
      const { getChannelByOwnerEmail, saveArticle: save } = await import('@/lib/api');
      const ch = await getChannelByOwnerEmail(session.user.email);
      if (!ch) { alert('No approved channel found for your account.'); return; }

      const saved = await save({
        id: id !== 'new' ? id : undefined,
        channelId: ch.id,
        channelSlug: ch.slug,
        channelName: ch.name,
        title: form.title,
        subheadline: form.subheadline,
        body,
        bodyHtml: body,
        excerpt,
        coverImageUrl: form.cover_image_url,
        category: form.category,
        authorName: form.author_name,
        authorEmail: session.user.email,
        politicianIds: taggedPoliticians.map(p => p.id),
        status: publish ? 'published' : 'draft',
      });

      setStatus(saved.status);
      if (publish) router.push('/channel/dashboard');
      else alert('Draft saved.');
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const addImage = useCallback(async () => {
    const url = prompt('Image URL');
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Editor toolbar */}
      <div className="sticky top-0 z-40 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-sm px-4 h-12 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-[#5a5a5a] hover:text-white transition-colors mr-2"
        >
          ← Back
        </button>

        {/* Format buttons */}
        {editor && (
          <div className="flex items-center gap-1 border-r border-[#2a2a2a] pr-3 mr-1">
            {[
              { cmd: () => editor.chain().focus().toggleBold().run(), label: 'B', active: editor.isActive('bold') },
              { cmd: () => editor.chain().focus().toggleItalic().run(), label: 'I', active: editor.isActive('italic') },
              { cmd: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), label: 'H2', active: editor.isActive('heading', { level: 2 }) },
              { cmd: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), label: 'H3', active: editor.isActive('heading', { level: 3 }) },
              { cmd: () => editor.chain().focus().toggleBlockquote().run(), label: '"', active: editor.isActive('blockquote') },
              { cmd: () => editor.chain().focus().toggleBulletList().run(), label: '•', active: editor.isActive('bulletList') },
              { cmd: addImage, label: '🖼', active: false },
            ].map(({ cmd, label, active }) => (
              <button
                key={label}
                onClick={cmd}
                className={`w-7 h-7 flex items-center justify-center text-xs rounded transition-colors font-mono ${active ? 'bg-white text-black' : 'text-[#6a6a6a] hover:text-white hover:bg-[#1a1a1a]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className={`text-[11px] ${status === 'published' ? 'text-[#22c55e]' : 'text-[#5a5a5a]'}`}>
            {status === 'published' ? 'Published' : 'Draft'}
          </span>
          <button
            className="btn-ghost text-xs py-1.5"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            Save Draft
          </button>
          <button
            className="btn-primary text-xs py-1.5"
            onClick={() => handleSave(true)}
            disabled={saving || !form.title}
          >
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="max-w-article mx-auto px-4 py-10">
        {/* Article metadata */}
        <div className="space-y-4 mb-10 pb-8 border-b border-[#1a1a1a]">
          {/* Category */}
          <select className="input select text-sm w-40 py-2" value={form.category} onChange={set('category')}>
            <option value="">Category…</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          {/* Title */}
          <textarea
            className="w-full bg-transparent border-none text-white font-serif text-[2.2rem] font-bold leading-[1.1] placeholder-[#2a2a2a] focus:outline-none resize-none"
            placeholder="Article headline"
            rows={2}
            value={form.title}
            onChange={set('title')}
          />

          {/* Subheadline */}
          <textarea
            className="w-full bg-transparent border-none text-[#7a7a7a] font-serif text-lg italic placeholder-[#2a2a2a] focus:outline-none resize-none"
            placeholder="Subheadline (optional)"
            rows={2}
            value={form.subheadline}
            onChange={set('subheadline')}
          />

          {/* Author */}
          <input
            className="bg-transparent border-none text-[#5a5a5a] text-sm placeholder-[#2a2a2a] focus:outline-none w-full"
            placeholder="Author name"
            value={form.author_name}
            onChange={set('author_name')}
          />

          {/* Politician tagging */}
          <div className="border-t border-[#1a1a1a] pt-4">
            <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-2">Tag Politicians, Ministers</p>

            {/* Tagged pills */}
            {taggedPoliticians.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {taggedPoliticians.map(p => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border border-[#2a2a2a] text-[#9a9a9a]">
                    <span className="text-[9px] px-1 py-0.5 rounded" style={{
                      color: p.level === 'MP' ? '#3b82f6' : p.level === 'MLA' ? '#f59e0b' : '#22c55e',
                      background: p.level === 'MP' ? '#3b82f620' : p.level === 'MLA' ? '#f59e0b20' : '#22c55e20'
                    }}>{p.level}</span>
                    {p.name}
                    <button onClick={() => untagPolitician(p.id)} className="text-[#4a4a4a] hover:text-[#ef4444] ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Search box */}
            <div className="relative max-w-sm">
              <input
                className="input text-sm py-1.5 w-full"
                placeholder="Search MLA / MP / Minister…"
                value={tagSearch}
                onChange={e => searchPoliticians(e.target.value)}
              />
              {tagResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg max-h-48 overflow-y-auto shadow-xl">
                  {tagResults.map(p => (
                    <button key={p.id} onClick={() => tagPolitician(p)}
                      className="w-full text-left px-3 py-2 text-sm text-[#d0d0d0] hover:bg-[#222] transition-colors flex items-center gap-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{
                        color: p.level === 'MP' ? '#3b82f6' : p.level === 'MLA' ? '#f59e0b' : '#22c55e',
                        background: p.level === 'MP' ? '#3b82f620' : p.level === 'MLA' ? '#f59e0b20' : '#22c55e20'
                      }}>{p.level}</span>
                      <span>{p.name}</span>
                      <span className="text-[11px] text-[#4a4a4a] ml-auto">{p.constituency_name}, {p.state}</span>
                    </button>
                  ))}
                </div>
              )}
              {tagSearching && <p className="text-[11px] text-[#4a4a4a] mt-1">Searching…</p>}
            </div>
          </div>
        </div>

        {/* Cover image */}
        <div className="mb-8">
          {coverPreview ? (
            <div className="relative aspect-[16/9] overflow-hidden bg-[#141414] mb-2">
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              <button
                className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80"
                onClick={() => { setCoverPreview(null); setForm((f) => ({ ...f, cover_image_url: '' })); }}
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center border border-dashed border-[#2a2a2a] rounded aspect-[16/9] cursor-pointer hover:border-[#3a3a3a] transition-colors">
              <div className="text-center">
                <p className="text-[#4a4a4a] text-sm">+ Add cover image</p>
                <p className="text-[#3a3a3a] text-[11px] mt-1">JPG or PNG, ideally 1600×900</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          )}
        </div>

        {/* TipTap editor body */}
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .article-editor-content {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.05rem;
          line-height: 1.85;
          color: #c0c0c0;
          min-height: 400px;
        }
        .article-editor-content p { margin-bottom: 1.4em; }
        .article-editor-content p.is-empty::before {
          content: attr(data-placeholder);
          color: #2a2a2a;
          pointer-events: none;
          position: absolute;
        }
        .article-editor-content h2 {
          font-size: 1.4rem; font-weight: 700; color: #f0f0f0;
          margin: 2em 0 0.75em; line-height: 1.25;
        }
        .article-editor-content h3 {
          font-size: 1.15rem; font-weight: 600; color: #e0e0e0;
          margin: 1.5em 0 0.5em;
        }
        .article-editor-content blockquote {
          border-left: 2px solid #b8860b;
          padding-left: 1.25rem; margin: 2em 0;
          font-style: italic; color: #9a9a9a;
        }
        .article-editor-content img { width: 100%; height: auto; margin: 2em 0; }
        .article-editor-content ul, .article-editor-content ol {
          padding-left: 1.5em; margin-bottom: 1.5em;
        }
        .article-editor-content li { margin-bottom: 0.4em; }
        .tiptap { position: relative; }
      `}</style>
    </div>
  );
}
