// ============================================================================
// OnboardingWizard.tsx - Experiência Cinematográfica NoCry (5 Atos)
// ============================================================================
// PROPÓSITO:
// - Onboarding épico em 5 atos cinematográficos
// - Design dark premium minimalista com tokens CSS customizados
// - Animações sofisticadas e performáticas com Framer Motion
// - Tipografia hierárquica e espaçamentos consistentes
// - Glass morphism, reflexos metálicos e gradientes radiais
// - Acessibilidade e responsividade completas
// ============================================================================

"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useWalletAccounts, useWalletCards } from "@/hooks/finance/wallet";
import { saveBudget } from "@/services/budgets";
import { currentMonthKey } from "@/lib/dates";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Sparkles } from "lucide-react";

type Act = 1 | 2 | 3 | 4 | 5;

// ═══════════════════════════════════════════════════════════════════════════
// NameModal - Modal Refinado para Conta/Cartão
// ═══════════════════════════════════════════════════════════════════════════
function NameModal({
  isOpen,
  title,
  placeholder,
  confirmLabel = "Confirmar",
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  placeholder: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  async function handleConfirm() {
    if (name.trim().length < 2 || saving) return;
    setSaving(true);
    try {
      await onConfirm(name.trim());
      setName("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md px-5"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
          setName("");
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md rounded-xl border bg-[var(--nc-glass)] backdrop-blur-md p-6 md:p-7"
        style={{
          borderColor: "var(--nc-border)",
          boxShadow: "var(--nc-shadow)",
        }}
      >
        <h3
          id="modal-title"
          className="text-xl font-bold mb-4"
          style={{ color: "var(--nc-white)" }}
        >
          {title}
        </h3>

        <input
          type="text"
          className="w-full rounded-lg bg-transparent border px-4 py-3 text-white placeholder:text-[var(--nc-text-dim)] outline-none transition-all duration-300 focus:ring-2"
          style={{
            borderColor: "var(--nc-border)",
          }}
          placeholder={placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleConfirm();
            }
            if (e.key === "Escape" && !saving) {
              onClose();
              setName("");
            }
          }}
          autoFocus
          disabled={saving}
          aria-label={`Campo de ${title.toLowerCase()}`}
          aria-invalid={name.trim().length > 0 && name.trim().length < 2}
        />

        {name.trim().length > 0 && name.trim().length < 2 && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs mt-2"
            style={{ color: "#ff6b6b" }}
            role="alert"
          >
            Mínimo 2 caracteres
          </motion.p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={() => {
              onClose();
              setName("");
            }}
            disabled={saving}
            className="rounded-lg border px-4 py-2 transition-colors duration-300 hover:bg-white/5 disabled:opacity-50"
            style={{
              borderColor: "var(--nc-border)",
              color: "var(--nc-text)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || name.trim().length < 2}
            className="relative overflow-hidden inline-flex items-center justify-center rounded-lg px-5 py-2 font-semibold text-black transition-all duration-300 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--nc-gold-20)]"
            style={{
              backgroundColor: "var(--nc-gold)",
            }}
          >
            {!saving && (
              <span
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.35),transparent)] animate-shine"
                style={{ transform: "translateX(-120%)" }}
              />
            )}
            <span>{saving ? "Salvando..." : confirmLabel}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OnboardingWizard - Componente Principal
// ═══════════════════════════════════════════════════════════════════════════
export default function OnboardingWizard({ fullName }: { fullName: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const sb = createSupabaseBrowser();

  const [act, setAct] = useState<Act>(1);
  const [pactAccepted, setPactAccepted] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3 | 4>(1);
  const [isCompleting, setIsCompleting] = useState(false);

  // Modais
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // Fetch contas e cartões
  const { data: accounts = [], refetch: refetchAccounts } = useWalletAccounts();
  const { data: cards = [], refetch: refetchCards } = useWalletCards();

  // Validações
  const canProgressFromAccount = accounts.length >= 1;
  const canProgressFromCard = cards.length >= 1;

  // ─────────────────────────────────────────────────────────────────────────
  // Funções de Criação
  // ─────────────────────────────────────────────────────────────────────────
  async function createAccount(accountName: string) {
    try {
      const { error } = await sb
        .from("accounts")
        .insert({ name: accountName, balance_cents: 0 })
        .select()
        .single();

      if (error) throw error;

      toast.success("Conta criada. Fluxo ancorado.");
      await refetchAccounts();
      qc.invalidateQueries({ queryKey: ["wallet-accounts"] });
      setIsAccountModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar conta");
      throw e;
    }
  }

  async function createCard(cardName: string) {
    try {
      const { error } = await sb
        .from("cards")
        .insert({
          name: cardName,
          closing_day: 5,
          due_day: 12,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Cartão pronto. Fatura sob controle.");
      await refetchCards();
      qc.invalidateQueries({ queryKey: ["wallet-cards"] });
      setIsCardModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar cartão");
      throw e;
    }
  }

  async function createDefaultCategories() {
    try {
      const cats = [
        { name: "Salário", type: "income", icon: "💰" },
        { name: "Vendas", type: "income", icon: "💵" },
        { name: "Moradia", type: "expense", icon: "🏠" },
        { name: "Transporte", type: "expense", icon: "🚗" },
        { name: "Alimentação", type: "expense", icon: "🍔" },
      ];
      const { error } = await sb.from("categories").insert(cats);
      if (error) throw error;
      toast.success("Categorias criadas.");
      qc.invalidateQueries({ queryKey: ["categories"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar categorias");
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // NÃO precisa mais da função local saveBudget - usa serviço unificado
  // Ver: src/services/budgets.ts → saveBudget()
  // ─────────────────────────────────────────────────────────────────────

  async function completeOnboarding() {
    setIsCompleting(true);
    try {
      const { data: userData, error: userErr } = await sb.auth.getUser();

      if (userErr || !userData?.user) {
        toast.error("Sessão expirada. Faça login novamente.");
        window.location.href = "/login";
        return;
      }

      const userId = userData.user.id;
      const nowIso = new Date().toISOString();

      const { error } = await sb
        .from("profiles")
        .update({
          onboarding_done: true,
          onboarding_completed_at: nowIso,
          onboarding_step: "done",
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;

      setAct(5);
    } catch (e: any) {
      toast.error(e.message || "Erro ao concluir onboarding");
      setIsCompleting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cálculo de Progresso (Ato 3)
  // ─────────────────────────────────────────────────────────────────────────
  const progressPercent = setupStep === 1 ? 25 : setupStep === 2 ? 50 : setupStep === 3 ? 75 : 100;

  return (
    <div
      className="min-h-screen text-white overflow-hidden relative"
      style={{ backgroundColor: "var(--nc-bg)" }}
    >
      {/* Gradientes de fundo (layers) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_50%_0%,rgba(212,175,55,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_100%,rgba(212,175,55,0.10),transparent_60%)]" />
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ATO 1 — ENTRADA NO TEATRO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {act === 1 && (
          <motion.div
            key="act1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 md:px-8 text-center pt-24 md:pt-32 pb-16"
          >
            <div className="max-w-4xl mx-auto w-full">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                className="w-full flex items-center justify-center mb-8 md:mb-12"
                aria-label="NoCry Group"
              >
                <img
                  src="/nocry-onboarding.png"
                  alt="NoCry Group"
                  className="w-[160px] md:w-[220px] h-auto select-none pointer-events-none"
                  draggable={false}
                />
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4"
                style={{ color: "var(--nc-white)" }}
              >
                Seja bem-vindo à NoCry Group.
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-lg md:text-xl font-medium mb-6"
                style={{ color: "var(--nc-gold)" }}
              >
                "Se o mundo é um teatro, somos nós que criamos o roteiro."
              </motion.p>

              {/* Copy */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto"
                style={{ color: "var(--nc-text)" }}
              >
                Aqui não seguimos tendências — nós as definimos.
                <br />
                Este é o seu acesso ao nosso sistema. Sua jornada começa aqui.
              </motion.div>

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAct(2)}
                className="relative overflow-hidden inline-flex items-center justify-center rounded-lg px-8 py-4 font-bold text-lg text-black transition-all duration-300 hover:brightness-110 focus:outline-none focus:ring-2 min-w-[220px]"
                style={{
                  backgroundColor: "var(--nc-gold)",
                }}
                aria-label="Avançar para o próximo ato"
              >
                <span
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.35),transparent)] animate-shine"
                  style={{ transform: "translateX(-120%)" }}
                />
                <span>Entrar no Bastidor</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ATO 2 — O CONTRATO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {act === 2 && (
          <motion.div
            key="act2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 md:px-8 py-12"
          >
            <div className="max-w-6xl mx-auto w-full">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-center mb-4"
                style={{ color: "var(--nc-white)" }}
              >
                O Contrato
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-center mb-12 max-w-2xl mx-auto leading-relaxed"
                style={{ color: "var(--nc-text)" }}
              >
                Antes de entrar, você precisa entender as regras do jogo.
              </motion.p>

              {/* 3 Cards */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.12,
                    },
                  },
                }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
              >
                {[
                  {
                    title: "Excelência",
                    text: "Excelência é regra. Métrica é lei. Ego fica do lado de fora. Você entra para construir — e cobrar o resultado.",
                  },
                  {
                    title: "Mentalidade",
                    text: "Digital, Finanças, Cripto. Um só grupo, várias frentes, uma só mentalidade.",
                  },
                  {
                    title: "Exclusividade",
                    text: "O que é da NoCry, fica na NoCry. Sem vazamentos. Sem desculpas. Apenas exclusividade.",
                  },
                ].map((card, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, scale: 0.96, y: 8 },
                      visible: { opacity: 1, scale: 1, y: 0 },
                    }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "var(--nc-shadow)",
                    }}
                    transition={{ duration: 0.3 }}
                    className="rounded-xl border backdrop-blur-md p-6 md:p-7"
                    style={{
                      borderColor: "var(--nc-border)",
                      backgroundColor: "var(--nc-glass)",
                    }}
                  >
                    <h3
                      className="text-xl font-bold mb-3"
                      style={{ color: "var(--nc-gold)" }}
                    >
                      {card.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--nc-text)" }}
                    >
                      {card.text}
                    </p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Checkbox */}
              <motion.label
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-3 mb-6 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={pactAccepted}
                  onChange={(e) => setPactAccepted(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer"
                  style={{
                    borderColor: "var(--nc-gold)",
                    backgroundColor: pactAccepted ? "var(--nc-gold)" : "transparent",
                  }}
                  aria-label="Aceitar o contrato NoCry"
                  aria-checked={pactAccepted}
                />
                <span
                  className="font-medium transition-colors"
                  style={{
                    color: pactAccepted ? "var(--nc-gold)" : "var(--nc-white)",
                  }}
                >
                  Eu aceito me tornar um Membro NoCry
                </span>
              </motion.label>

              {/* CTA */}
              <div className="flex justify-center">
                <AnimatePresence>
                  {pactAccepted && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAct(3)}
                      className="relative overflow-hidden inline-flex items-center justify-center rounded-lg px-8 py-4 font-bold text-lg text-black transition-all duration-300 hover:brightness-110 min-w-[220px]"
                      style={{ backgroundColor: "var(--nc-gold)" }}
                    >
                      <span
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.35),transparent)] animate-shine"
                        style={{ transform: "translateX(-120%)" }}
                      />
                      <span>Começar a montar meu setup</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ATO 3 — SETUP GUIADO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {act === 3 && (
          <motion.div
            key="act3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 min-h-screen flex flex-col px-5 md:px-8 py-12"
          >
            {/* Barra de Progresso */}
            <div className="max-w-3xl mx-auto w-full mb-10">
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--nc-border)" }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full"
                  style={{ backgroundColor: "var(--nc-gold)" }}
                />
              </div>
              <div
                className="text-center mt-2 text-sm"
                style={{ color: "var(--nc-text)" }}
              >
                Passo {setupStep} de 4
              </div>
            </div>

            {/* Container Central */}
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-2xl w-full">
                <AnimatePresence mode="wait">
                  {/* ─────────────────────────────────────────────────── */}
                  {/* PASSO 1 — CONTA */}
                  {/* ─────────────────────────────────────────────────── */}
                  {setupStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ type: "tween", duration: 0.35 }}
                      className="rounded-xl border backdrop-blur-md p-6 md:p-8"
                      style={{
                        borderColor: "var(--nc-border)",
                        backgroundColor: "var(--nc-glass)",
                      }}
                    >
                      <h3
                        className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-3"
                        style={{ color: "var(--nc-white)" }}
                      >
                        Seu fluxo precisa de um porto.
                      </h3>
                      <p
                        className="mb-6 leading-relaxed"
                        style={{ color: "var(--nc-text)" }}
                      >
                        Conecte a primeira conta. Nomeie como quiser. Começa por aqui.
                      </p>

                      {/* Lista de contas criadas */}
                      {accounts.length > 0 && (
                        <div className="mb-6 space-y-2">
                          {accounts.map((acc: any) => (
                            <div
                              key={acc.id}
                              className="flex items-center gap-2 text-sm"
                              style={{ color: "var(--nc-gold)" }}
                            >
                              <Check className="w-4 h-4" aria-hidden="true" />
                              <span>{acc.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setIsAccountModalOpen(true)}
                          className="px-6 py-3 rounded-lg border font-medium transition-all duration-300 hover:bg-[var(--nc-gold)] hover:text-black"
                          style={{
                            borderColor: "var(--nc-gold)",
                            color: "var(--nc-gold)",
                          }}
                        >
                          Criar Conta Principal
                        </button>

                        {canProgressFromAccount && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => setSetupStep(2)}
                            className="px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:brightness-110 flex items-center gap-2"
                            style={{
                              backgroundColor: "var(--nc-gold)",
                              color: "#000",
                            }}
                            aria-label="Avançar para o próximo passo"
                          >
                            Avançar <ChevronRight className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* ─────────────────────────────────────────────────── */}
                  {/* PASSO 2 — CARTÃO */}
                  {/* ─────────────────────────────────────────────────── */}
                  {setupStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ type: "tween", duration: 0.35 }}
                      className="rounded-xl border backdrop-blur-md p-6 md:p-8"
                      style={{
                        borderColor: "var(--nc-border)",
                        backgroundColor: "var(--nc-glass)",
                      }}
                    >
                      <h3
                        className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-3"
                        style={{ color: "var(--nc-white)" }}
                      >
                        Domine suas finanças como um especialista.
                      </h3>
                      <p
                        className="mb-6 leading-relaxed"
                        style={{ color: "var(--nc-text)" }}
                      >
                        Crie o primeiro cartão. Fechamento e vencimento você ajusta depois.
                      </p>

                      {/* Lista de cartões criados */}
                      {cards.length > 0 && (
                        <div className="mb-6 space-y-2">
                          {cards.map((card: any) => (
                            <div
                              key={card.id}
                              className="flex items-center gap-2 text-sm"
                              style={{ color: "var(--nc-gold)" }}
                            >
                              <Check className="w-4 h-4" aria-hidden="true" />
                              <span>{card.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setSetupStep(1)}
                          className="px-6 py-3 rounded-lg border transition-all duration-300 hover:bg-white/5"
                          style={{
                            borderColor: "var(--nc-border)",
                            color: "var(--nc-white)",
                          }}
                        >
                          Voltar
                        </button>

                        <button
                          onClick={() => setIsCardModalOpen(true)}
                          className="px-6 py-3 rounded-lg border font-medium transition-all duration-300 hover:bg-[var(--nc-gold)] hover:text-black"
                          style={{
                            borderColor: "var(--nc-gold)",
                            color: "var(--nc-gold)",
                          }}
                        >
                          Criar Cartão Principal
                        </button>

                        {canProgressFromCard && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => setSetupStep(3)}
                            className="px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:brightness-110 flex items-center gap-2"
                            style={{
                              backgroundColor: "var(--nc-gold)",
                              color: "#000",
                            }}
                          >
                            Avançar <ChevronRight className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* ─────────────────────────────────────────────────── */}
                  {/* PASSO 3 — CATEGORIAS */}
                  {/* ─────────────────────────────────────────────────── */}
                  {setupStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ type: "tween", duration: 0.35 }}
                      className="rounded-xl border backdrop-blur-md p-6 md:p-8"
                      style={{
                        borderColor: "var(--nc-border)",
                        backgroundColor: "var(--nc-glass)",
                      }}
                    >
                      <h3
                        className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-3"
                        style={{ color: "var(--nc-white)" }}
                      >
                        Ordem no caos.
                      </h3>
                      <p
                        className="mb-6 leading-relaxed"
                        style={{ color: "var(--nc-text)" }}
                      >
                        Crie categorias-chave e acelere seu lançamento.
                      </p>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setSetupStep(2)}
                          className="px-6 py-3 rounded-lg border transition-all duration-300 hover:bg-white/5"
                          style={{
                            borderColor: "var(--nc-border)",
                            color: "var(--nc-white)",
                          }}
                        >
                          Voltar
                        </button>

                        <button
                          onClick={async () => {
                            await createDefaultCategories();
                            setSetupStep(4);
                          }}
                          className="px-6 py-3 rounded-lg border font-medium transition-all duration-300 hover:bg-[var(--nc-gold)] hover:text-black"
                          style={{
                            borderColor: "var(--nc-gold)",
                            color: "var(--nc-gold)",
                          }}
                        >
                          Adicionar agora
                        </button>

                        <button
                          onClick={() => setSetupStep(4)}
                          className="px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:brightness-110"
                          style={{
                            backgroundColor: "var(--nc-gold)",
                            color: "#000",
                          }}
                        >
                          Pular
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ─────────────────────────────────────────────────── */}
                  {/* PASSO 4 — ORÇAMENTO */}
                  {/* ─────────────────────────────────────────────────── */}
                  {setupStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ type: "tween", duration: 0.35 }}
                      className="rounded-xl border backdrop-blur-md p-6 md:p-8"
                      style={{
                        borderColor: "var(--nc-border)",
                        backgroundColor: "var(--nc-glass)",
                      }}
                    >
                      <h3
                        className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-3"
                        style={{ color: "var(--nc-white)" }}
                      >
                        Limite que liberta.
                      </h3>
                      <p
                        className="mb-6 leading-relaxed"
                        style={{ color: "var(--nc-text)" }}
                      >
                        Defina um teto. Disciplina multiplica capital.
                      </p>

                      <BudgetQuickForm
                        onSave={async (cents) => {
                          try {
                            // Usar serviço unificado (RPC seguro) + helper padronizado
                            const monthKey = currentMonthKey();
                            await saveBudget({ 
                              amountCents: cents, 
                              monthKey 
                            });
                            
                            // Invalidar queries relevantes (Dashboard, Carteira, etc.)
                            qc.invalidateQueries({ queryKey: ["budget", monthKey] });
                            qc.invalidateQueries({ queryKey: ["monthly-budget", monthKey] });
                            qc.invalidateQueries({ queryKey: ["pf-month-summary"] });
                            qc.invalidateQueries({ queryKey: ["finance-dashboard", monthKey] });
                            
                            toast.success("Orçamento definido!");
                            setAct(4);
                          } catch (e: any) {
                            console.error('[Onboarding][Budget] Falha:', e);
                            toast.error(e?.message ?? 'Erro ao salvar orçamento');
                          }
                        }}
                        onSkip={() => setAct(4)}
                        onBack={() => setSetupStep(3)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ATO 4 — REVISÃO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {act === 4 && (
          <motion.div
            key="act4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 md:px-8 text-center pt-20 pb-20"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="max-w-2xl"
            >
              <div className="mb-6" style={{ color: "var(--nc-gold)" }}>
                <Sparkles className="w-16 h-16 mx-auto" aria-hidden="true" />
              </div>

              <h2
                className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-4"
                style={{ color: "var(--nc-white)" }}
              >
                Configuração inicial completa.
              </h2>

              <p
                className="text-lg mb-10 leading-relaxed"
                style={{ color: "var(--nc-text)" }}
              >
                Tudo pronto para começar a construir.
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={completeOnboarding}
                disabled={isCompleting}
                className="relative overflow-hidden inline-flex items-center justify-center rounded-lg px-10 py-4 font-bold text-lg text-black transition-all duration-300 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed min-w-[220px]"
                style={{ backgroundColor: "var(--nc-gold)" }}
              >
                {!isCompleting && (
                  <span
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.35),transparent)] animate-shine"
                    style={{ transform: "translateX(-120%)" }}
                  />
                )}
                <span>{isCompleting ? "Finalizando..." : "Finalizar e entrar no sistema"}</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ATO 5 — PUNCH FINAL */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {act === 5 && (
          <motion.div
            key="act5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 md:px-8 text-center pt-20 pb-20"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(212,175,55,0.15) 0%, rgba(0,0,0,1) 70%)",
            }}
          >
            {/* Logo em fade (background) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.08 }}
              transition={{ delay: 0.3, duration: 1.5 }}
              className="absolute pointer-events-none select-none"
              aria-hidden="true"
            >
              <img
                src="/nocry-onboarding.png"
                alt=""
                className="w-[400px] md:w-[600px] h-auto opacity-100"
                draggable={false}
              />
            </motion.div>

            {/* Texto principal */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="relative z-10 max-w-3xl"
            >
              <h1
                className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-8"
                style={{ color: "var(--nc-white)" }}
              >
                Pronto. Agora você não apenas segue as regras — você as cria.
              </h1>

              <p
                className="text-xl mb-12"
                style={{ color: "var(--nc-gold)" }}
              >
                Bem-vindo ao ambiente onde a estratégia vira patrimônio.
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  // Flash dourado breve
                  const flash = document.createElement("div");
                  flash.className =
                    "fixed inset-0 pointer-events-none z-[100]";
                  flash.style.backgroundColor = "var(--nc-gold)";
                  flash.style.opacity = "1";
                  document.body.appendChild(flash);
                  
                  setTimeout(() => {
                    flash.style.transition = "opacity 0.6s";
                    flash.style.opacity = "0";
                    setTimeout(() => flash.remove(), 600);
                  }, 100);

                  // Invalidar todas as queries relevantes (Dashboard reflete orçamento)
                  const monthKey = currentMonthKey();
                  await Promise.all([
                    qc.invalidateQueries({ queryKey: ["budget", monthKey] }),
                    qc.invalidateQueries({ queryKey: ["monthly-budget", monthKey] }),
                    qc.invalidateQueries({ queryKey: ["pf-month-summary"] }),
                    qc.invalidateQueries({ queryKey: ["finance-dashboard", monthKey] }),
                    qc.invalidateQueries({ queryKey: ["my-profile"] }),
                  ]);

                  setTimeout(() => {
                    router.push("/");
                    // Garante refresh de Server Components
                    setTimeout(() => router.refresh(), 50);
                    // Opcional: revalidar cache de Server Components
                    fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
                  }, 700);
                }}
                className="relative overflow-hidden inline-flex items-center justify-center rounded-lg px-12 py-4 font-bold text-xl text-black transition-all duration-300 hover:brightness-110 min-w-[220px]"
                style={{
                  backgroundColor: "var(--nc-gold)",
                  boxShadow: "0 0 40px rgba(212,175,55,0.3)",
                }}
              >
                <span
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.35),transparent)] animate-shine"
                  style={{ transform: "translateX(-120%)" }}
                />
                <span>Ir para o Dashboard</span>
              </motion.button>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-sm mt-8"
                style={{ color: "var(--nc-text-dim)" }}
              >
                Dica: visite "Carteira" para lançar suas primeiras configurações.
              </motion.p>
            </motion.div>

            {/* Pulse dourado sutil */}
            <motion.div
              animate={{
                opacity: [0.1, 0.2, 0.1],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 pointer-events-none animate-pulse-glow"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(212,175,55,0.1) 0%, transparent 60%)",
              }}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modais */}
      <NameModal
        isOpen={isAccountModalOpen}
        title="Criar Conta"
        placeholder="Ex.: Conta Nubank, Conta Caixa..."
        confirmLabel="Criar Conta"
        onClose={() => setIsAccountModalOpen(false)}
        onConfirm={createAccount}
      />

      <NameModal
        isOpen={isCardModalOpen}
        title="Criar Cartão"
        placeholder="Ex.: Cartão Nubank, Cartão Visa..."
        confirmLabel="Criar Cartão"
        onClose={() => setIsCardModalOpen(false)}
        onConfirm={createCard}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BudgetQuickForm - Formulário rápido de orçamento
// ═══════════════════════════════════════════════════════════════════════════
function BudgetQuickForm({
  onSave,
  onSkip,
  onBack,
}: {
  onSave: (cents: number) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState("");

  function handleSave() {
    const num = parseFloat(value.replace(/[^\d,]/g, "").replace(",", "."));
    if (!num || num <= 0) {
      toast.error("Digite um valor válido");
      return;
    }
    onSave(Math.round(num * 100));
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          className="block text-sm mb-2"
          style={{ color: "var(--nc-text)" }}
          htmlFor="budget-input"
        >
          Orçamento mensal (R$)
        </label>
        <input
          id="budget-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ex.: 5000,00"
          className="w-full rounded-lg bg-transparent border px-4 py-3 text-white text-lg outline-none transition-all focus:ring-2"
          style={{
            borderColor: "var(--nc-border)",
          }}
          aria-label="Campo de orçamento mensal"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg border transition-all duration-300 hover:bg-white/5"
          style={{
            borderColor: "var(--nc-border)",
            color: "var(--nc-white)",
          }}
        >
          Voltar
        </button>

        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 rounded-lg border font-medium transition-all duration-300 hover:bg-[var(--nc-gold)] hover:text-black"
          style={{
            borderColor: "var(--nc-gold)",
            color: "var(--nc-gold)",
          }}
        >
          Salvar
        </button>

        <button
          onClick={onSkip}
          className="px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:brightness-110"
          style={{
            backgroundColor: "var(--nc-gold)",
            color: "#000",
          }}
        >
          Pular
        </button>
      </div>
    </div>
  );
}
