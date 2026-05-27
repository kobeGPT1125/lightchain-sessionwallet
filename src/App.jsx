import { useState, useEffect, useCallback, useRef } from "react";

const LC = {
  purple: "#5B4BFF",
  pink:   "#DD00AC",
  dark:   "#14152C",
  light:  "#CCCEEF",
  grad:   "linear-gradient(135deg, #5B4BFF 0%, #EE11FB 100%)",
};

const CONTRACT_ADDRESS = "0xE21B0C69554138172CDe76b039d1aFE07d05B0A7";
const CHARITY_WALLET   = "0x69A9dA9c59B6E3B563CAea20a2a45413dFc526ee";
const CHAIN_ID_HEX     = "0x23F0";
const LCAI_PER_MESSAGE = 0.1; // cost per message in LCAI
const CHAIN_CONFIG = {
  chainId: CHAIN_ID_HEX,
  chainName: "Lightchain Mainnet",
  rpcUrls: ["https://rpc.mainnet.lightchain.ai"],
  nativeCurrency: { name: "LCAI", symbol: "LCAI", decimals: 18 },
  blockExplorerUrls: ["https://mainnet.lightscan.app"],
};

const SIG_FUND     = "0x22895421";
const SIG_GET_BAL  = "0xf8b2cb4f";
const SIG_WITHDRAW = "0x853828b6";

const weiToLcai = (wei) => (Number(wei) / 1e18).toFixed(4);
const short     = (addr) => addr.slice(0, 6) + "…" + addr.slice(-4);
const toWeiHex  = (amt)  => "0x" + Math.floor(amt * 1e18).toString(16);
const pad32     = (addr) => addr.slice(2).toLowerCase().padStart(64, "0");

const WHY_POINTS = [
  { icon: "⚡", title: "Your electricity bill goes up — because of them", body: "Data centers consume so much power that utility companies pass the grid upgrade costs directly onto residential customers. Your monthly bill rises while Big Tech pays almost nothing." },
  { icon: "🏫", title: "Your schools lose funding", body: "States hand out massive tax breaks to data centers — sometimes 80% reductions in property taxes. That money would have funded local public schools and infrastructure. In Missouri, a $1.4B data center project created almost zero permanent jobs while costing millions in lost tax revenue." },
  { icon: "🏙️", title: "Meta built one the size of Manhattan", body: "Meta's Louisiana data center covers an area the size of Manhattan and uses as much energy as New York City on a winter day — powered by 10 brand new natural gas plants. They got an 80% tax break quietly slipped into an unrelated rural broadband bill." },
  { icon: "🌊", title: "Millions of gallons of water — wasted daily", body: "Data centers use enormous amounts of water to cool their servers, often in areas already facing water stress. Farmers and communities lose access to water so Big Tech can run AI chatbots." },
  { icon: "😴", title: "Noise, vibrations, disrupted neighborhoods", body: "Residents living near these facilities report chronic noise pollution and constant vibrations that disrupt sleep and daily life. They're built in suburbs and rural areas over community protests — local governments approve them anyway." },
  { icon: "⛽", title: "Killing renewable energy progress", body: "To meet the massive power demands of AI, some utilities are stalling renewable energy transitions and burning more coal and natural gas. Backup diesel generators add to the air pollution." },
  { icon: "🤫", title: "Built in secret — no public record", body: "More than two new data centers are built per week in the US. Major tech companies use shell companies and 'trade secret' exemptions to hide locations and ownership. There is no central public record." },
  { icon: "💸", title: "Fake job promises", body: "Despite billion-dollar investments and massive tax breaks, most data centers employ only a handful of permanent staff. In Meta's Louisiana deal, there's no requirement to hire local workers — and if job targets are missed, the incentives are just reduced, not cancelled." },
];

const HOW_POINTS = [
  { icon: "🔒", title: "Your main wallet stays safe", body: "You connect MetaMask once to top up — then disconnect. The SessionWallet holds only your spending balance, like handing a cashier a $20 instead of your whole bank card." },
  { icon: "💳", title: "Load it like a phone top-up card", body: "Put LCAI into your SessionWallet and chat freely. When balance runs low, top up again. No subscriptions, no commitments." },
  { icon: "🤖", title: "No MetaMask popups — ever", body: "Once loaded, every AI message is paid silently from your session balance. No approvals, no interruptions. Just chat." },
  { icon: "⏱️", title: "Unused balance auto-returns", body: "Sessions expire after 1 hour. Any unspent LCAI comes straight back to your wallet automatically. Your money is never locked." },
];

export default function App() {
  const [account,     setAccount]     = useState(null);
  const [balance,     setBalance]     = useState(0);
  const [sessionOn,   setSessionOn]   = useState(false);
  const [amount,      setAmount]      = useState("");
  const [walletStatus, setWalletStatus] = useState("Connect your MetaMask wallet to get started");
  const [loading,     setLoading]     = useState(false);
  const [messages,    setMessages]    = useState([
    { role: "assistant", text: "👋 Hey! I'm the Lightchain AI Assistant. Top up your SessionWallet above and start chatting — no MetaMask popups, ever. Every message you send helps fund real dog rescues. 🐕" }
  ]);
  const [input,       setInput]       = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab,   setActiveTab]   = useState("why"); // why | wallet | chat
  const chatEndRef = useRef(null);

  const fees = {
    user:    amount ? (parseFloat(amount) * 0.97).toFixed(4) : "—",
    charity: amount ? (parseFloat(amount) * 0.02).toFixed(4) : "—",
    dev:     amount ? (parseFloat(amount) * 0.01).toFixed(4) : "—",
  };

  const loadBalance = useCallback(async (addr) => {
    try {
      const hex = await window.ethereum.request({
        method: "eth_call",
        params: [{ to: CONTRACT_ADDRESS, data: SIG_GET_BAL + pad32(addr) }, "latest"],
      });
      const wei = parseInt(hex, 16);
      const lcai = Number(wei) / 1e18;
      setBalance(lcai);
      setSessionOn(lcai > 0);
    } catch {}
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) { setWalletStatus("MetaMask not found — please install it first"); return; }
    setLoading(true);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== CHAIN_ID_HEX) {
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
        } catch (e) {
          if (e.code === 4902) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [CHAIN_CONFIG] });
        }
      }
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      setAccount(accounts[0]);
      setWalletStatus(`Connected — ${short(accounts[0])} · Lightchain Mainnet`);
      await loadBalance(accounts[0]);
    } catch (e) { setWalletStatus("Connection failed: " + (e.message || e)); }
    setLoading(false);
  };

  const fundSession = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setWalletStatus("Enter an amount to top up"); return; }
    setLoading(true);
    try {
      setWalletStatus("Confirm the transaction in MetaMask…");
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: CONTRACT_ADDRESS, value: toWeiHex(amt), data: SIG_FUND }],
      });
      setWalletStatus("Top-up sent! Tx: " + txHash.slice(0, 14) + "…");
      setAmount("");
      setTimeout(() => loadBalance(account), 5000);
    } catch (e) { setWalletStatus("Transaction failed: " + (e.message || e)); }
    setLoading(false);
  };

  const withdrawExpired = async () => {
    setLoading(true);
    try {
      setWalletStatus("Confirm withdrawal in MetaMask…");
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: CONTRACT_ADDRESS, data: SIG_WITHDRAW }],
      });
      setWalletStatus("Withdrawal sent! Tx: " + txHash.slice(0, 14) + "…");
    } catch (e) { setWalletStatus("Withdrawal failed: " + (e.message || e)); }
    setLoading(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    if (!account) {
      setMessages(m => [...m, { role: "assistant", text: "⚠️ Please connect your MetaMask wallet first, then top up your SessionWallet to start chatting." }]);
      return;
    }
    if (balance < LCAI_PER_MESSAGE) {
      setMessages(m => [...m, { role: "assistant", text: `⚠️ Your session balance is too low. You need at least ${LCAI_PER_MESSAGE} LCAI per message. Top up your card above! 💳` }]);
      setActiveTab("wallet");
      return;
    }

    const userMsg = { role: "user", text };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setChatLoading(true);

    // Deduct balance locally for instant feedback
    setBalance(b => Math.max(0, b - LCAI_PER_MESSAGE));

    try {
      const history = messages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are a helpful AI assistant on Lightchain AI — a decentralized blockchain network.
You help users with questions about crypto, blockchain, Lightchain AI, and general topics.
Keep responses concise and friendly.
The user is paying ${LCAI_PER_MESSAGE} LCAI per message from their SessionWallet.
Never mention that you are Claude or made by Anthropic — you are the Lightchain AI Assistant.`,
          messages: [...history, { role: "user", content: text }],
        }),
      });

      const data = await response.json();
      const reply = data.text || "Sorry, something went wrong. Please try again.";
      setMessages(m => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", text: "⚠️ Connection error. Please try again." }]);
      // Refund balance on error
      setBalance(b => b + LCAI_PER_MESSAGE);
    }
    setChatLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  useEffect(() => {
    if (!window.ethereum) return;
    const handle = (accounts) => {
      if (accounts.length === 0) { setAccount(null); setWalletStatus("Wallet disconnected"); setBalance(0); }
      else { setAccount(accounts[0]); loadBalance(accounts[0]); }
    };
    window.ethereum.on("accountsChanged", handle);
    return () => window.ethereum.removeListener("accountsChanged", handle);
  }, [loadBalance]);

  const TAB = (id, label, emoji) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        flex: 1, padding: "10px 6px",
        background: activeTab === id ? LC.grad : "transparent",
        border: activeTab === id ? "none" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px", color: activeTab === id ? "#fff" : LC.light,
        fontSize: "13px", fontWeight: 600, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >{emoji} {label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0D0E1F", fontFamily: "'DM Sans', sans-serif", color: "#E8E9F8", paddingBottom: "4rem" }}>

      {/* ── HERO ── */}
      <div style={{ background: LC.dark, borderBottom: "1px solid rgba(91,75,255,0.2)", padding: "2rem 1rem 1.75rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", left: "50%", transform: "translateX(-50%)", width: "500px", height: "250px", background: "radial-gradient(ellipse, rgba(91,75,255,0.3) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
          Lightchain <span style={{ color: LC.pink }}>AI</span> SessionWallet
        </div>
        <div style={{ height: "3px", background: LC.grad, borderRadius: "999px", width: "56px", margin: "10px auto" }} />
        <div style={{ fontSize: "14px", color: LC.light, opacity: 0.8, lineHeight: 1.6 }}>
          Decentralized AI chat on Lightchain · No MetaMask popups · Every session rescues real dogs 🐕
        </div>
        <div style={{ fontSize: "12px", color: LC.light, opacity: 0.45, marginTop: "6px", fontStyle: "italic" }}>
          The alternative to Big Tech data centers destroying your community
        </div>

        {/* Balance pill in hero */}
        {account && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "14px", background: "rgba(91,75,255,0.15)", border: "1px solid rgba(91,75,255,0.3)", borderRadius: "999px", padding: "6px 16px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: sessionOn ? "#4ade80" : "rgba(255,255,255,0.3)", display: "inline-block" }} />
            <span style={{ fontSize: "13px", color: "#fff", fontWeight: 600 }}>{balance.toFixed(4)} LCAI</span>
            <span style={{ fontSize: "12px", color: LC.light, opacity: 0.6 }}>· {short(account)}</span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: "620px", margin: "0 auto", padding: "1.5rem 1rem 0" }}>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
          {TAB("why",    "Why Lightchain", "🌍")}
          {TAB("wallet", "Top Up Card",    "💳")}
          {TAB("chat",   "AI Chat",        "🤖")}
        </div>

        {/* ══════════════════════════════════════
            TAB 1 — WHY LIGHTCHAIN AI
        ══════════════════════════════════════ */}
        {activeTab === "why" && (
          <div>
            <div style={{ fontSize: "11px", color: LC.purple, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: "8px" }}>Why it matters</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: "6px" }}>Big Tech data centers are hurting your community</div>
            <div style={{ fontSize: "14px", color: "rgba(204,206,239,0.65)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Every time you use ChatGPT, Google AI, or Meta AI, you're funding infrastructure that raises your electricity bill, drains your water supply, cuts school funding, and disrupts neighborhoods — all while paying almost no local taxes.
            </div>

            {WHY_POINTS.map((p) => (
              <div key={p.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "1rem 1.25rem", display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "22px", flexShrink: 0, marginTop: "2px" }}>{p.icon}</div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>{p.title}</div>
                  <div style={{ fontSize: "13px", color: "rgba(204,206,239,0.65)", lineHeight: 1.6 }}>{p.body}</div>
                </div>
              </div>
            ))}

            <div style={{ background: "rgba(91,75,255,0.1)", border: "1px solid rgba(91,75,255,0.3)", borderRadius: "14px", padding: "1.5rem", textAlign: "center", margin: "1.5rem 0" }}>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#fff", lineHeight: 1.5, marginBottom: "10px" }}>
                "Every time you use AI on Lightchain, you're choosing a decentralized network that doesn't waste your water, spike your electricity bill, or rob your schools — and 2% of every session rescues real dogs around the world."
              </div>
              <button onClick={() => setActiveTab("wallet")} style={{ marginTop: "10px", padding: "10px 24px", background: LC.grad, color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                Get Started — Top Up Your Card →
              </button>
            </div>

            <div style={{ background: LC.dark, border: "1px solid rgba(221,0,172,0.25)", borderRadius: "14px", padding: "1.25rem", textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff", marginBottom: "6px" }}>🐕 Real dogs rescued — on social media</div>
              <div style={{ fontSize: "13px", color: "rgba(204,206,239,0.65)", lineHeight: 1.6 }}>
                Every session top-up automatically sends 2% on-chain to the dog rescue wallet. The rescues are real — filmed and posted on TikTok, YouTube, Instagram, Facebook, and X so you can see exactly where your contribution goes. No middleman, no charity overhead, fully transparent on-chain.
              </div>
              <a href={`https://mainnet.lightscan.app/address/${CHARITY_WALLET}`} target="_blank" rel="noreferrer"
                style={{ display: "inline-block", marginTop: "10px", background: "rgba(221,0,172,0.15)", color: LC.pink, fontSize: "12px", padding: "4px 12px", borderRadius: "999px", fontWeight: 600, border: "1px solid rgba(221,0,172,0.3)", textDecoration: "none" }}>
                ↗ View rescue wallet on-chain
              </a>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 2 — WALLET
        ══════════════════════════════════════ */}
        {activeTab === "wallet" && (
          <div>
            {/* How it works */}
            <div style={{ fontSize: "11px", color: LC.purple, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: "8px" }}>How it works</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#fff", marginBottom: "6px" }}>Your main wallet stays safe — always</div>
            <div style={{ fontSize: "13px", color: "rgba(204,206,239,0.65)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              Connect MetaMask once to top up, then disconnect. The SessionWallet holds only your spending balance — like handing a cashier a $20 instead of your whole bank card. Once loaded, chat freely with zero MetaMask interruptions.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {HOW_POINTS.map(p => (
                <div key={p.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "0.875rem 1rem" }}>
                  <div style={{ fontSize: "22px", marginBottom: "6px" }}>{p.icon}</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>{p.title}</div>
                  <div style={{ fontSize: "12px", color: "rgba(204,206,239,0.6)", lineHeight: 1.6 }}>{p.body}</div>
                </div>
              ))}
            </div>

            {/* Status */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "9px 14px", fontSize: "13px", color: LC.light, textAlign: "center", marginBottom: "1.25rem" }}>
              {walletStatus}
            </div>

            {/* Connect button */}
            <button
              onClick={!account ? connectWallet : undefined}
              disabled={!!account || loading}
              style={{ width: "100%", padding: "13px", background: account ? "rgba(255,255,255,0.07)" : LC.grad, color: account ? "rgba(255,255,255,0.3)" : "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 600, cursor: account ? "not-allowed" : "pointer", marginBottom: "1.25rem", fontFamily: "'DM Sans', sans-serif" }}
            >
              {account ? `✓ ${short(account)} connected` : "Connect MetaMask"}
            </button>

            {/* Phone card */}
            <div style={{ background: LC.dark, border: "1px solid rgba(91,75,255,0.3)", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.25rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "140px", height: "140px", background: "radial-gradient(circle, rgba(238,17,251,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ fontSize: "11px", color: LC.light, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Your session balance</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "34px", fontWeight: 700, color: "#fff", letterSpacing: "-1px" }}>{balance.toFixed(4)}</div>
              <div style={{ fontSize: "13px", color: LC.light, opacity: 0.7, marginTop: "2px" }}>LCAI available · ~{Math.floor(balance / LCAI_PER_MESSAGE)} messages remaining</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "12px", background: "rgba(255,255,255,0.08)", borderRadius: "999px", padding: "4px 12px", fontSize: "12px", color: "#fff" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: sessionOn ? "#4ade80" : "rgba(255,255,255,0.3)", display: "inline-block" }} />
                {sessionOn ? "Session active" : "No active session"}
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
                <div style={{ fontSize: "11px", color: "rgba(204,206,239,0.6)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>Cost per message</div>
                <div style={{ fontSize: "22px", fontWeight: 600, background: LC.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{LCAI_PER_MESSAGE} LCAI</div>
                <div style={{ fontSize: "12px", color: "rgba(204,206,239,0.6)", marginTop: "2px" }}>No MetaMask popup</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
                <div style={{ fontSize: "11px", color: "rgba(204,206,239,0.6)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>Dogs rescued</div>
                <div style={{ fontSize: "22px", fontWeight: 600, background: LC.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>2% of every tx</div>
                <a href={`https://mainnet.lightscan.app/address/${CHARITY_WALLET}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: LC.purple, textDecoration: "none", marginTop: "6px" }}>↗ View wallet</a>
              </div>
            </div>

            {/* Fund card */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "11px", color: "rgba(204,206,239,0.6)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>Top up your card</div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input type="number" placeholder="0.00" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                  style={{ flex: 1, padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "15px", color: "#fff", fontFamily: "'Space Mono', monospace", outline: "none" }} />
                <span style={{ fontSize: "13px", color: LC.light, opacity: 0.7, fontWeight: 600 }}>LCAI</span>
              </div>
              <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(204,206,239,0.6)", padding: "3px 0" }}>
                  <span>Your session credit (97%)</span><span style={{ color: "#E8E9F8", fontWeight: 500 }}>{fees.user}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(204,206,239,0.6)", padding: "3px 0" }}>
                  <span>Dog rescue fund (2%)</span>
                  <span style={{ background: LC.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontWeight: 600 }}>{fees.charity}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(204,206,239,0.6)", padding: "3px 0" }}>
                  <span>Dev fee (1%)</span><span style={{ color: "#E8E9F8", fontWeight: 500 }}>{fees.dev}</span>
                </div>
                {amount && <div style={{ marginTop: "8px", fontSize: "12px", color: LC.purple, textAlign: "center" }}>≈ {Math.floor((parseFloat(amount)||0) * 0.97 / LCAI_PER_MESSAGE)} messages after top-up</div>}
              </div>
              <button onClick={fundSession} disabled={!account || loading}
                style={{ width: "100%", padding: "13px", background: (!account || loading) ? "rgba(255,255,255,0.07)" : LC.grad, color: (!account || loading) ? "rgba(255,255,255,0.3)" : "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 600, cursor: (!account || loading) ? "not-allowed" : "pointer", marginTop: "12px", fontFamily: "'DM Sans', sans-serif" }}>
                Top Up Card
              </button>
            </div>

            {/* Withdraw */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "11px", color: "rgba(204,206,239,0.6)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>Withdraw expired balance</div>
              <p style={{ fontSize: "13px", color: "rgba(204,206,239,0.6)", marginBottom: "12px", lineHeight: 1.6 }}>Session expired? Click below to claim unused LCAI back to your wallet.</p>
              <button onClick={withdrawExpired} disabled={!account || loading}
                style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "14px", color: LC.light, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Withdraw expired balance
              </button>
            </div>

            {/* Contract info */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "11px", color: "rgba(204,206,239,0.6)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>Contract details</div>
              {[["SessionWallet v2","0xE21B…0A7"],["Dog rescue wallet","0x69A9…6ee"],["Dev wallet","0xFE1e…82E"],["Session duration","1 hour"],["Cost per message",`${LCAI_PER_MESSAGE} LCAI`]].map(([l,v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "rgba(204,206,239,0.5)", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span>{l}</span><span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "rgba(204,206,239,0.8)" }}>{v}</span>
                </div>
              ))}
              <a href={`https://mainnet.lightscan.app/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: LC.purple, textDecoration: "none", marginTop: "10px" }}>
                ↗ Verify contract on lightscan.app
              </a>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 3 — CHAT
        ══════════════════════════════════════ */}
        {activeTab === "chat" && (
          <div>
            {/* Balance bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "10px 14px", marginBottom: "1rem" }}>
              <div style={{ fontSize: "13px", color: LC.light }}>
                Session balance: <strong style={{ color: "#fff", fontFamily: "'Space Mono', monospace" }}>{balance.toFixed(4)} LCAI</strong>
                <span style={{ color: "rgba(204,206,239,0.45)", fontSize: "12px", marginLeft: "6px" }}>· ~{Math.floor(balance / LCAI_PER_MESSAGE)} messages left</span>
              </div>
              {balance < LCAI_PER_MESSAGE && (
                <button onClick={() => setActiveTab("wallet")}
                  style={{ padding: "5px 12px", background: LC.grad, color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Top Up
                </button>
              )}
            </div>

            {/* Chat window */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", height: "420px", overflowY: "auto", padding: "1rem", marginBottom: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: m.role === "user" ? LC.grad : "rgba(255,255,255,0.05)",
                    border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                    fontSize: "14px", lineHeight: 1.6, color: "#fff", whiteSpace: "pre-wrap",
                  }}>
                    {m.role === "assistant" && <div style={{ fontSize: "10px", color: LC.purple, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Lightchain AI</div>}
                    {m.text}
                    {m.role === "user" && <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", marginTop: "4px", textAlign: "right" }}>−{LCAI_PER_MESSAGE} LCAI</div>}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px 14px 14px 4px", fontSize: "14px", color: LC.light }}>
                    <div style={{ fontSize: "10px", color: LC.purple, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Lightchain AI</div>
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input row */}
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={account ? (balance >= LCAI_PER_MESSAGE ? "Ask anything… (Enter to send)" : "Top up your card to chat") : "Connect wallet first…"}
                disabled={chatLoading}
                style={{ flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "14px", color: "#fff", fontFamily: "'DM Sans', sans-serif", outline: "none" }}
              />
              <button onClick={sendMessage} disabled={chatLoading || !input.trim()}
                style={{ padding: "12px 20px", background: (!input.trim() || chatLoading) ? "rgba(255,255,255,0.07)" : LC.grad, color: (!input.trim() || chatLoading) ? "rgba(255,255,255,0.3)" : "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
                Send →
              </button>
            </div>

            <div style={{ fontSize: "11px", color: "rgba(204,206,239,0.3)", textAlign: "center", marginTop: "8px" }}>
              {LCAI_PER_MESSAGE} LCAI per message · No MetaMask popups · Powered by AI
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(204,206,239,0.3)", marginTop: "2.5rem", lineHeight: 1.9 }}>
          <div>Built on <strong style={{ color: LC.purple }}>Lightchain AI</strong> · Chain ID 9200</div>
          <div>Every transaction rescues real dogs 🐕</div>
          <div style={{ marginTop: "4px" }}>
            <a href="https://lightchain.ai" target="_blank" rel="noreferrer" style={{ color: LC.purple, textDecoration: "none" }}>lightchain.ai</a>
            {" · "}
            <a href={`https://mainnet.lightscan.app/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: LC.purple, textDecoration: "none" }}>contract</a>
            {" · "}
            <a href="https://discord.gg/lightchain" target="_blank" rel="noreferrer" style={{ color: LC.purple, textDecoration: "none" }}>discord</a>
          </div>
          <div style={{ fontSize: "11px", color: "rgba(204,206,239,0.2)", marginTop: "8px", fontStyle: "italic" }}>
            SessionWallet is an independent community project built on Lightchain AI. Not affiliated with or endorsed by Lightchain Protocol.
          </div>
        </div>

      </div>
    </div>
  );
}
