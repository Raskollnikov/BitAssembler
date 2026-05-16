import express from "express";
import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/tx/:txid", async (req, res) => {
  try {
    const r = await fetch(`https://mempool.space/api/tx/${req.params.txid}`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/broadcast", async (req, res) => {
  try {
    const r = await fetch("https://mempool.space/api/tx", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: req.body.hex,
    });
    const text = await r.text();
    if (r.ok) res.json({ txid: text });
    else res.status(400).json({ error: text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => console.log("proxy running on :3001"));
