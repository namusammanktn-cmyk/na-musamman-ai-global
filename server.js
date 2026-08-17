app.use((_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});
