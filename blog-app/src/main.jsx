import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import '@blocknote/core/fonts/inter.css';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDocFromServer, writeBatch } from 'firebase/firestore';
import './style.css';
let config = {};
let configError = '';
try {
 const response = await fetch('/blog-config.json?v=' + Date.now(), {cache:'no-store'});
 if (!response.ok) throw new Error('Configuration request failed (HTTP ' + response.status + ').');
 config = await response.json();
} catch (error) { configError = error.message; }
const ready = !!config.firebase?.projectId;
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
 const [topicRecords,setTopicRecords]=useState([]);
 const [topic,setTopic]=useState('All'),[status,setStatus]=useState(''),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
 const [ownerSession,setOwnerSession]=useState(null);
 const revision=useRef(0), saving=useRef(false);
 const owner=!!user && ownerSession===user.uid;
 useEffect(()=>{
   let active=true;
   setOwnerSession(null);
   if(user && db) getDocFromServer(doc(db,'blogAccess','owner'))
     .then(()=>{if(active)setOwnerSession(user.uid);})
     .catch(e=>{if(active && e.code!=='permission-denied')setStatus('Could not verify owner access. Please retry signing in.');});
   return()=>{active=false;};
 },[user]);
 useEffect(()=>auth ? onAuthStateChanged(auth,setUser) : undefined,[]);
 useEffect(()=>{ if(!db)return;setPosts([]);setCurrent(null);
 const source=owner ? collection(db,'blogPosts') : query(collection(db,'blogPosts'),where('published','==',true));
 return onSnapshot(source,s=>setPosts(s.docs.map(d=>({...d.data(),id:d.id}))),e=>setStatus(e.message));
 },[owner]);
 useEffect(()=>db ? onSnapshot(collection(db,'blogTopics'),s=>setTopicRecords(s.docs.map(d=>d.data().name)),e=>setStatus(e.message)) : undefined,[]);
 useEffect(()=>{ const warn=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const update=fields=>{revision.current++;setCurrent(p=>({...p,...fields}));setDirty(true);};
 const choose=p=>{if(dirty&&!confirm('Discard unsaved changes?'))return;setCurrent(p);setDirty(false);setStatus('');};
 const create=(name)=>{setTopic(name);choose({id:crypto.randomUUID(),title:'Untitled',topic:name,date:new Date().toLocaleDateString('en-CA'),blocks:empty,published:false});};
 async function save(published, automatic=false){
  if(!owner||!current||saving.current)return;
  if(!current.title.trim()||!current.topic.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(current.date)){
   if(!automatic)setStatus('Add a title, topic, and valid date.');
   return;
  }
  const snapshot=current, savedRevision=revision.current;
  saving.current=true;setBusy(true);
  try{
   const value={...snapshot,published,updatedAt:new Date().toISOString()};
   delete value.id;
   const batch=writeBatch(db);
   batch.set(doc(db,'blogPosts',snapshot.id),value);
   batch.set(doc(db,'blogTopics',encodeURIComponent(value.topic)),{name:value.topic});
   await batch.commit();
   setCurrent(p=>p?.id===snapshot.id?{...p,...(revision.current===savedRevision?{published}:{})}:p);
   if(revision.current===savedRevision){setDirty(false);setStatus(automatic?'Autosaved.':published?'Published.':'Draft saved.');}
  }catch(e){setStatus('Save failed: '+e.message);}
  finally{saving.current=false;setBusy(false);}
 }
 useEffect(()=>{
  if(!owner||!dirty||!current||busy)return;
  const timer=setTimeout(()=>save(current.published,true),11000);
  return()=>clearTimeout(timer);
 },[owner,dirty,current,busy]);
 async function remove(){if(!owner||!current||!confirm('Delete this page permanently?'))return;setBusy(true);try{await deleteDoc(doc(db,'blogPosts',current.id));setCurrent(null);setDirty(false);}catch(e){setStatus(e.message);}finally{setBusy(false);}}
 const topics=[...new Set([...topicRecords,...posts.map(p=>p.topic)].filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 async function addTopic(){
  if(!owner||busy)return;
  const value=prompt('New topic name');const name=value?.trim();if(!name)return;
  if(name.length>100){setStatus('Topic names must be 100 characters or fewer.');return;}
  setBusy(true);try{await setDoc(doc(db,'blogTopics',encodeURIComponent(name)),{name});setTopic(name);}catch(e){setStatus(e.message);}finally{setBusy(false);}
 }
 async function renameTopic(name){
  if(!owner||busy)return;
  const value=prompt('Rename topic',name);const next=value?.trim();if(!next||next===name)return;
  if(next.length>100||topics.includes(next)){setStatus('Choose a unique topic name, up to 100 characters.');return;}
  if(dirty){setStatus('Save your current edits before renaming a topic.');return;}
  const affected=posts.filter(p=>p.topic===name);if(affected.length>450){setStatus('This topic is too large to rename in one operation.');return;}
  setBusy(true);try{const batch=writeBatch(db);batch.delete(doc(db,'blogTopics',encodeURIComponent(name)));batch.set(doc(db,'blogTopics',encodeURIComponent(next)),{name:next});affected.forEach(p=>batch.update(doc(db,'blogPosts',p.id),{topic:next}));await batch.commit();setTopic(next);setCurrent(p=>p?.topic===name?{...p,topic:next}:p);}catch(e){setStatus(e.message);}finally{setBusy(false);}
 }
 async function removeTopic(name){
  if(!owner||busy)return;
  if(dirty){setStatus('Save your current edits before removing a topic.');return;}
  const affected=posts.filter(p=>p.topic===name);
  if(affected.length>450){setStatus('This topic is too large to remove in one operation.');return;}
  if(!confirm('Remove "'+name+'" and permanently delete its '+affected.length+' posts?'))return;
  setBusy(true);try{const batch=writeBatch(db);batch.delete(doc(db,'blogTopics',encodeURIComponent(name)));affected.forEach(p=>batch.delete(doc(db,'blogPosts',p.id)));await batch.commit();if(current?.topic===name)setCurrent(null);setTopic('All');}catch(e){setStatus(e.message);}finally{setBusy(false);}
 }
 async function removePost(post){if(!owner||busy)return;if(dirty){setStatus('Save or discard your edits before removing a post.');return;}if(!confirm('Permanently delete "'+post.title+'"?'))return;setBusy(true);try{await deleteDoc(doc(db,'blogPosts',post.id));if(current?.id===post.id)setCurrent(null);}catch(e){setStatus(e.message);}finally{setBusy(false);}}
 const sortedPosts=[...posts].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const sidebar=<aside><div className="topic-heading"><h2>Topics</h2>{owner&&<button disabled={busy} aria-label="Add topic" onClick={addTopic}>+</button>}</div>
 {topics.map(t=><div className="topic-group" key={t}><div className="topic-row"><button className={topic===t?'topic-name selected':'topic-name'} onClick={()=>setTopic(t)}>{t}</button>{owner&&<><button disabled={busy} aria-label={'Add post to '+t} onClick={()=>create(t)}>+</button><button disabled={busy} aria-label={'Rename topic '+t} onClick={()=>renameTopic(t)}>✎</button><button disabled={busy} aria-label={'Remove topic '+t} onClick={()=>removeTopic(t)}>−</button></>}</div>
 <div className="topic-posts">{sortedPosts.filter(p=>p.topic===t).map(p=><div className="post-row" key={p.id}><button className="post-name" onClick={()=>choose(p)}><strong>{p.title}</strong><small>{p.date}{!p.published?' · Draft':''}</small></button>{owner&&<><button disabled={busy} aria-label={'Edit post '+p.title} onClick={()=>choose(p)}>✎</button><button disabled={busy} aria-label={'Remove post '+p.title} onClick={()=>removePost(p)}>−</button></>}</div>)}</div></div>)}
 {!topics.length&&<p>No topics yet.</p>}</aside>;
 return <main><header><a href="/">← Portfolio</a><h1>Blog</h1>{ready&&(user?<button onClick={()=>{if(!dirty||confirm("Discard unsaved changes and sign out?"))signOut(auth).catch(e=>setStatus(e.message));}}>Sign out</button>:<button onClick={()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>setStatus(e.message))}>Owner sign in</button>)}</header>
 {!ready ? <section className="setup"><h2>Your editor is built; connect Firebase to enable publishing.</h2><p>{configError || 'Firebase configuration is missing from this deployment. Check the FIREBASE_WEB_CONFIG Actions secret and run deployment again.'}</p><a href="https://github.com/YCHuang2112sub/ychuang2112sub.github.io/blob/main/BLOG.md" target="_blank" rel="noreferrer">Setup instructions</a></section> : <div className="layout">{sidebar}<section className="page">{current ? <>{owner?<><input aria-label="Page title" value={current.title} onChange={e=>update({title:e.target.value})}/><div className="metadata"><input aria-label="Topic" placeholder="New or existing topic" list="topics" value={current.topic} onChange={e=>update({topic:e.target.value})}/><datalist id="topics">{topics.map(t=><option key={t} value={t}/>)}</datalist><input aria-label="Publication date" type="date" value={current.date} onChange={e=>update({date:e.target.value})}/></div><div className="actions"><button disabled={busy} onClick={()=>save(false)}>Save draft</button><button disabled={busy} onClick={()=>save(true)}>Publish</button><button disabled={busy} onClick={remove}>Delete</button><span>{dirty?'Unsaved changes':current.published?'Published':'Draft'}</span></div></>:<><h2>{current.title}</h2><p>{current.date} · {current.topic}</p></>}<Content key={current.id+String(owner)} post={current} writable={owner} onChange={blocks=>update({blocks})}/></>:<p>Select a page{owner?' or create one':''} to start.</p>}</section></div>}
 <p role="status">{status}</p>{ready&&user&&!owner&&<p>You are signed in as a reader. Only the owner can edit.</p>}</main>;
}
createRoot(document.getElementById('root')).render(<App/>);

