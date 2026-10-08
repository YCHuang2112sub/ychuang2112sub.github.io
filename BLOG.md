# Writing blog posts

Edit `assets/js/blog-data.js` in GitHub to add topics and articles. Commit to `main`; the existing GitHub Pages workflow publishes the changes.

Every topic appears in the left-hand list. Each topic can contain multiple articles. Articles are sorted by date, newest first; use `YYYY-MM-DD` dates. Undated articles appear last. Every string in `paragraphs` renders as a separate paragraph, preserving any newline characters inside it.

Example topic:

```js
{
  id: "my-new-topic",
  title: "My New Topic",
  posts: [
    {
      title: "My First Article",
      date: "2026-10-08",
      paragraphs: [
        "My first paragraph.",
        "My second paragraph."
      ]
    }
  ]
}
```

Add this object inside `window.blogTopics`, separating topic objects with commas. Use a unique `id` for each topic. Add more article objects to `posts`, also separated by commas.

The public website displays published content. Authoring happens in the repository; it does not provide a public editing form or store drafts in visitors' browsers.
