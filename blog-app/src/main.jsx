import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import '@blocknote/core/fonts/inter.css';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import './style.css';
const config = window.BLOG_CONFIG || {};
const ready = !!(config.firebase?.projectId && config.ownerUid);
const app = ready ? initializeApp(config.firebase) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const empty = [{type:'paragraph',content:''}];
function Content({post, writable, onChange}) {
 const editor = useCreateBlockNote({initialContent: post.blocks?.length ? post.blocks : empty});
 return <BlockNoteView editor={editor} theme="dark" editable={writable} onChange={()=>onChange?.(editor.document)}/>;
}
function App() {
 const [user,setUser]=useState(null),[posts,setPosts]=useState([]),[current,setCurrent]=useState(null);
 const [topic,setTopic]=useState('All'),[status,setStatus]=useState(''),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
 const owner=ready && user?.uid===config.ownerUid;
 useEffect(()=>auth ? onAuthStateChanged(auth,setUser) : undefined,[]);
 useEffect(()=>{ if(!db)return;setPosts([]);setCurrent(null);
 const source=owner ? collection(db,'blogPosts') : query(collection(db,'blogPosts'),where('published','==',true));
 return onSnapshot(source,s=>setPosts(s.docs.map(d=>({...d.data(),id:d.id}))),e=>setStatus(e.message));
 },[owner]);
 useEffect(()=>{ const warn=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const update=fields=>{setCurrent(p=>({...p,...fields}));setDirty(true);};
 const choose=p=>{if(dirty&&!confirm('Discard unsaved changes?'))return;setCurrent(p);setDirty(false);setStatus('');};
 const create=()=>choose({id:crypto.randomUUID(),title:'Untitled',topic:topic==='All'?'General':topic,date:new Date().toLocaleDateString('en-CA'),blocks:empty,published:false});
 async function save(published){if(!owner||!current)return;if(!current.title.trim()||!current.topic.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(current.date)){setStatus('Add a title, topic, and valid date.');return;}
 setBusy(true);try{const value={...current,published,updatedAt:new Date().toISOString()};delete value.id;await setDoc(doc(db,'blogPosts',current.id),value);setCurrent(p=>({...p,published}));setDirty(false);setStatus(published?'Published.':'Draft saved.');}catch(e){setStatus(e.message);}finally{setBusy(false);}}
 async function remove(){if(!owner||!current||!confirm('Delete this page permanently?'))return;setBusy(true);try{await deleteDoc(doc(db,'blogPosts',current.id));setCurrent(null);setDirty(false);}catch(e){setStatus(e.message);}finally{setBusy(false);}}
 const topics=['All',...new Set(posts.map(p=>p.topic).filter(Boolean))];
 const visible=posts.filter(p=>topic==='All'||p.topic===topic).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 return <main><header><a href="/">← Portfolio</a><h1>Blog</h1>{ready&&(user?<button onClick={()=>{if(!dirty||confirm("Discard unsaved changes and sign out?"))signOut(auth).catch(e=>setStatus(e.message));}}>Sign out</button>:<button onClick={()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>setStatus(e.message))}>Owner sign in</button>)}</header>
 {!ready ? <section className="setup"><h2>Your editor is built; connect Firebase to enable publishing.</h2><p>Configure blog-config.js and deploy the supplied Firestore rules. Sign in is restricted to your configured owner UID for editing.</p><a href="https://github.com/YCHuang2112sub/ychuang2112sub.github.io/blob/main/BLOG.md" target="_blank" rel="noreferrer">Setup instructions</a></section> : <div className="layout"><aside><h2>Topics</h2>{topics.map(t=><button key={t} className={topic===t?'selected':''} onClick={()=>setTopic(t)}>{t}</button>)}{owner&&<button onClick={create}>＋ New page</button>}<h2>Pages</h2>{visible.map(p=><button key={p.id} onClick={()=>choose(p)}><strong>{p.title}</strong><small>{p.date}{!p.published?' · Draft':''}</small></button>)}{!visible.length&&<p>No pages yet.</p>}</aside><section className="page">{current ? <>{owner?<><input aria-label="Page title" value={current.title} onChange={e=>update({title:e.target.value})}/><div className="metadata"><input aria-label="Topic" placeholder="New or existing topic" list="topics" value={current.topic} onChange={e=>update({topic:e.target.value})}/><datalist id="topics">{topics.slice(1).map(t=><option key={t} value={t}/>)}</datalist><input aria-label="Publication date" type="date" value={current.date} onChange={e=>update({date:e.target.value})}/></div><div className="actions"><button disabled={busy} onClick={()=>save(false)}>Save draft</button><button disabled={busy} onClick={()=>save(true)}>Publish</button><button disabled={busy} onClick={remove}>Delete</button><span>{dirty?'Unsaved changes':current.published?'Published':'Draft'}</span></div></>:<><h2>{current.title}</h2><p>{current.date} · {current.topic}</p></>}<Content key={current.id+String(owner)} post={current} writable={owner} onChange={blocks=>update({blocks})}/></>:<p>Select a page{owner?' or create one':''} to start.</p>}</section></div>}
 <p role="status">{status}</p>{ready&&user&&!owner&&<p>You are signed in as a reader. Only the owner can edit.</p>}</main>;
}
createRoot(document.getElementById('root')).render(<App/>);
