'use strict';
(() => {
  const topics = window.blogTopics || [];
  const list = document.querySelector('[data-blog-topics]');
  const reading = document.querySelector('[data-blog-reading]');
  if (!list || !reading) return;
  const addText = (parent, tag, value, className) => {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  };
  const showTopic = (topic) => {
    reading.replaceChildren();
    list.querySelectorAll('button').forEach(button => {
      const active = button.dataset.topic === topic.id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    addText(reading, 'h3', topic.title, 'h3');
    if (!topic.posts.length) addText(reading, 'p', 'No articles published in this topic yet.', 'blog-empty');
    [...topic.posts].sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(post => {
      const article = document.createElement('article');
      article.className = 'blog-post';
      addText(article, 'h4', post.title, 'h4');
      if (post.date) {
        const time = addText(article, 'time', post.date);
        time.dateTime = post.date;
      }
      (post.paragraphs || []).forEach(paragraph => addText(article, 'p', paragraph));
      reading.appendChild(article);
    });
  };
  topics.forEach(topic => {
    const button = addText(list, 'button', topic.title, 'blog-topic-button');
    button.type = 'button';
    button.dataset.topic = topic.id;
    button.addEventListener('click', () => showTopic(topic));
  });
  if (topics.length) showTopic(topics[0]);
  else addText(reading, 'p', 'No topics published yet.', 'blog-empty');
})();
