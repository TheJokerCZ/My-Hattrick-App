import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  Heart,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import {
  SPECIALTY_LABELS,
  getSkillBadgeColor,
} from '../constants/skillsAndTerms';
import {
  parseHattrickCopyPaste,
  parseHattrickExcelFile,
  parseHattrickExcelText,
  parseHattrickPlayersXml,
  parseHattrickTrainingAndTeamXml,
} from '../engine/parsers';
import { ChppCredentials, ClubSettings, Player } from '../types/hattrick';

type ImportTab = 'excel' | 'paste' | 'chpp' | 'xml' | 'json';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  chpp: ChppCredentials;
  onUpdateChpp: (chpp: ChppCredentials) => void;
  onImportPlayers: (imported: Player[], mode: 'replace' | 'merge', clubPatch?: Partial<ClubSettings>) => void;
  onExportJson: () => string;
  onImportJson: (raw: string) => void;
  onResetSampleSquad: () => void;
}

const SAMPLE_PASTE_HINT = `7. Václav Černý (451238901)
22 let a 18 dní, další narozeniny: 14.02.2027
Ve formě dobrá, v kondici solidní
Zkušenosti má nedostatečné a vůdcovské schopnosti slabé.
Věrnost je světová (13).
Specialita: Rychlý
TSI: 11 800
Plat: 71 000 Kč/týden
Brankář: 1/20 mizerný
Bránění: 4/20 slabý
Tvorba hry: 7/20 dobrý
Křídlo: 11/20 brilantní
Přihrávky: 7/20 dobrý
Zakončování: 5/20 nedostatečný
Standardní situace: 4/20 slabý`;

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  chpp,
  onUpdateChpp,
  onImportPlayers,
  onExportJson,
  onImportJson,
  onResetSampleSquad,
}) => {
  const [tab, setTab] = useState<ImportTab>('excel');
  const [pasteText, setPasteText] = useState('');
  const [previewPlayers, setPreviewPlayers] = useState<Player[]>([]);
  const [excelText, setExcelText] = useState('');
  const [excelPreviewPlayers, setExcelPreviewPlayers] = useState<Player[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // CHPP state
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [consumerKey, setConsumerKey] = useState(chpp.consumerKey);
  const [consumerSecret, setConsumerSecret] = useState(chpp.consumerSecret);
  const [requestToken, setRequestToken] = useState('');
  const [requestTokenSecret, setRequestTokenSecret] = useState('');
  const [authorizeUrl, setAuthorizeUrl] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loadingChpp, setLoadingChpp] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStatusMsg(null);
    fetch('/api/health')
      .then((r) => setServerOnline(r.ok))
      .catch(() => setServerOnline(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExcelFileUpload = async (file: File) => {
    setIsParsingExcel(true);
    setStatusMsg(null);
    setExcelFileName(file.name);
    try {
      const parsed = await parseHattrickExcelFile(file);
      if (parsed.length === 0) {
        setStatusMsg({
          type: 'err',
          text: `V souboru „${file.name}“ nebyli nalezeni žádní hráči. Ujisti se, že soubor obsahuje export z Foxtricku nebo Hattricku.`,
        });
        setExcelPreviewPlayers([]);
      } else {
        setExcelPreviewPlayers(parsed);
        setStatusMsg({
          type: 'ok',
          text: `Úspěšně načteno ${parsed.length} hráčů ze souboru „${file.name}“ (včetně věku, pozic a instrukcí)!`,
        });
      }
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Chyba při čtení Excel souboru.',
      });
      setExcelPreviewPlayers([]);
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleExcelFileUpload(file);
    }
  };

  const handleExcelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleExcelFileUpload(file);
    }
  };

  const handleAnalyzeExcelText = (text: string) => {
    setExcelText(text);
    setStatusMsg(null);
    if (!text.trim()) {
      setExcelPreviewPlayers([]);
      return;
    }
    try {
      const parsed = parseHattrickExcelText(text);
      if (parsed.length > 0) {
        setExcelPreviewPlayers(parsed);
        setStatusMsg({
          type: 'ok',
          text: `Rozpoznáno ${parsed.length} hráčů z vložené tabulky!`,
        });
      } else {
        const fallback = parseHattrickCopyPaste(text);
        if (fallback.length > 0) {
          setExcelPreviewPlayers(fallback);
          setStatusMsg({
            type: 'ok',
            text: `Rozpoznáno ${fallback.length} hráčů (textový formát).`,
          });
        } else {
          setExcelPreviewPlayers([]);
        }
      }
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Chyba při analýze dat.',
      });
      setExcelPreviewPlayers([]);
    }
  };

  const handleConfirmExcelImport = () => {
    if (excelPreviewPlayers.length === 0) {
      setStatusMsg({
        type: 'err',
        text: 'Není vybrán žádný platný seznam hráčů pro import.',
      });
      return;
    }
    onImportPlayers(excelPreviewPlayers, importMode);
    setStatusMsg({
      type: 'ok',
      text: `Úspěšně naimportováno ${excelPreviewPlayers.length} hráčů do kádru!`,
    });
    setTimeout(() => onClose(), 800);
  };

  const handleAnalyzePaste = (text: string) => {
    setPasteText(text);
    setStatusMsg(null);
    if (!text.trim()) {
      setPreviewPlayers([]);
      return;
    }
    const parsed = parseHattrickCopyPaste(text);
    setPreviewPlayers(parsed);
  };

  const handleConfirmPaste = () => {
    if (previewPlayers.length === 0) {
      setStatusMsg({
        type: 'err',
        text: 'Nepodařilo se rozpoznat žádné hráče. Zkontroluj vložený text.',
      });
      return;
    }
    onImportPlayers(previewPlayers, importMode);
    setStatusMsg({
      type: 'ok',
      text: `Úspěšně naimportováno ${previewPlayers.length} hráčů!`,
    });
    setTimeout(() => onClose(), 800);
  };

  const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = parseHattrickPlayersXml(content);
      onImportPlayers(parsed, importMode);
      setStatusMsg({
        type: 'ok',
        text: `Ze souboru ${file.name} bylo načteno ${parsed.length} hráčů.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Chyba při čtení XML.',
      });
    }
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      onImportJson(content);
      setStatusMsg({ type: 'ok', text: 'Záloha JSON byla úspěšně obnovena.' });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Neplatný JSON soubor.',
      });
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([onExportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myhattrick-zaloha-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRequestToken = async () => {
    setLoadingChpp(true);
    setStatusMsg(null);
    try {
      const resp = await fetch('/api/chpp/request-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerKey, consumerSecret }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Chyba žádosti o token');
      setRequestToken(data.requestToken);
      setRequestTokenSecret(data.requestTokenSecret);
      setAuthorizeUrl(data.authorizeUrl);
      onUpdateChpp({ ...chpp, consumerKey, consumerSecret });
      setStatusMsg({
        type: 'ok',
        text: 'Autorizační odkaz připraven. Otevři jej, potvrď přístup a vlož PIN kód.',
      });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'CHPP spojení selhalo.',
      });
    } finally {
      setLoadingChpp(false);
    }
  };

  const handleVerifyPin = async () => {
    setLoadingChpp(true);
    setStatusMsg(null);
    try {
      const resp = await fetch('/api/chpp/access-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumerKey,
          consumerSecret,
          requestToken,
          requestTokenSecret,
          verificationCode: pinCode,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Neplatný PIN kód');
      onUpdateChpp({
        consumerKey,
        consumerSecret,
        accessToken: data.accessToken,
        accessTokenSecret: data.accessTokenSecret,
      });
      setStatusMsg({
        type: 'ok',
        text: 'Účet Hattrick CHPP úspěšně propojen! Nyní klikni na Synchronizovat tým.',
      });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Ověření kódu selhalo.',
      });
    } finally {
      setLoadingChpp(false);
    }
  };

  const handleSyncChpp = async () => {
    setLoadingChpp(true);
    setStatusMsg(null);
    try {
      const resp = await fetch('/api/chpp/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumerKey: chpp.consumerKey || consumerKey,
          consumerSecret: chpp.consumerSecret || consumerSecret,
          accessToken: chpp.accessToken,
          accessTokenSecret: chpp.accessTokenSecret,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Synchronizace selhala');

      const parsedPlayers = parseHattrickPlayersXml(data.playersXml);
      const clubPatch = parseHattrickTrainingAndTeamXml(
        data.teamDetailsXml,
        data.trainingXml
      );
      onImportPlayers(parsedPlayers, 'replace', clubPatch);
      onUpdateChpp({
        ...chpp,
        lastSyncAt: new Date().toLocaleString('cs-CZ'),
      });
      setStatusMsg({
        type: 'ok',
        text: `Synchronizováno ${parsedPlayers.length} hráčů a klubové nastavení z Hattrick.org!`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Synchronizace z CHPP selhala.',
      });
    } finally {
      setLoadingChpp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-ht-border bg-ht-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-ht-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Import kádru & Synchronizace Hattrick</h2>
            <p className="text-xs text-slate-400">
              Načti svůj tým přes Excel (.xlsx, .csv), CHPP OAuth, XML soubor nebo zkopírovaný text z Hattricku.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-ht-card hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 border-b border-ht-border bg-[#0c1310]/60 p-2 sm:grid-cols-5">
          <button
            onClick={() => setTab('excel')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
              tab === 'excel'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-ht-card'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Excel / XLSX</span>
          </button>
          <button
            onClick={() => setTab('paste')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
              tab === 'paste'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-ht-card'
            }`}
          >
            <ClipboardPaste className="h-4 w-4" />
            <span>Copy-Paste text</span>
          </button>
          <button
            onClick={() => setTab('chpp')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
              tab === 'chpp'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-ht-card'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>CHPP API (OAuth)</span>
          </button>
          <button
            onClick={() => setTab('xml')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
              tab === 'xml'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-ht-card'
            }`}
          >
            <FileCode2 className="h-4 w-4" />
            <span>Hattrick XML</span>
          </button>
          <button
            onClick={() => setTab('json')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
              tab === 'json'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-ht-card'
            }`}
          >
            <FileJson className="h-4 w-4" />
            <span>Záloha JSON</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {statusMsg && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                statusMsg.type === 'ok'
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-rose-500/40 bg-rose-500/15 text-rose-200'
              }`}
            >
              {statusMsg.type === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {tab === 'excel' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-ht-border bg-ht-card/60 p-3 text-xs text-slate-300">
                <p className="font-semibold text-emerald-300">Import tabulky ze souboru nebo schránky (.xlsx, .xls, .csv, .tsv):</p>
                <p className="mt-1 text-slate-300">
                  Podporuje 45-sloupcový export z Foxtricku i běžné Excel tabulky. Aplikace automaticky převezme <strong>ID hráče, jméno, věk (roky i dny), specialitu, zdraví, karty, plat, formu, TSI, všech 7 dovedností</strong> i <strong>doporučené pozice a pokyny (NejP / Poz)</strong>, se kterými pak počítá optimalizátor sestavy.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-emerald-500"
                    />
                    <span className="text-slate-200 font-medium">Nahradit celý kádr</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-emerald-500"
                    />
                    <span className="text-slate-200 font-medium">Doplnit / aktualizovat existující</span>
                  </label>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleExcelDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  isDragOver
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-ht-border bg-[#0c1310]/60 hover:border-emerald-500/50'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">
                    {excelFileName ? `Vybrán soubor: ${excelFileName}` : 'Přetáhni sem Excel soubor (.xlsx, .xls, .csv)'}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">
                    Nebo klikni pro výběr souboru ze svého počítače
                  </p>
                </div>
                {isParsingExcel && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Zpracovávám tabulková data...</span>
                  </div>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values"
                  onChange={handleExcelFileChange}
                  className="hidden"
                />
              </label>

              {/* Quick Textarea Fallback for Clipboard paste */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  Nebo vlož zkopírovanou tabulku (buňky z Excelu / CSV text) ze schránky:
                </label>
                <textarea
                  value={excelText}
                  onChange={(e) => handleAnalyzeExcelText(e.target.value)}
                  rows={3}
                  placeholder="Vlož zkopírované buňky z Excelu nebo řádky oddělené středníkem/čárkou..."
                  className="w-full rounded-xl border border-ht-border bg-[#0c1310] p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Parsed Players Preview Table */}
              {excelPreviewPlayers.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-[#0c1310] p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Rozpoznáno v tabulce: {excelPreviewPlayers.length} hráčů</span>
                    </div>
                    <span className="text-slate-400">
                      Připraveno k nahrání do kádru ({importMode === 'replace' ? 'nahrazení' : 'sloučení'})
                    </span>
                  </div>

                  <div className="max-h-72 overflow-x-auto overflow-y-auto rounded-xl border border-ht-border/80">
                    <table className="w-full text-left text-[11px]">
                      <thead className="sticky top-0 border-b border-ht-border bg-slate-900/90 uppercase tracking-wider text-slate-400 backdrop-blur-sm">
                        <tr>
                          <th className="px-2.5 py-2">Hráč</th>
                          <th className="px-2 py-2 text-center">Nár</th>
                          <th className="px-2 py-2 text-center">Věk</th>
                          <th className="px-2 py-2 text-center">Specialita</th>
                          <th className="px-2 py-2 text-center">Stav</th>
                          <th className="px-2 py-2 text-center">NejP (Pokyn)</th>
                          <th className="px-2 py-2 text-right">TSI</th>
                          <th className="px-2 py-2 text-center" title="Brankář">BR</th>
                          <th className="px-2 py-2 text-center" title="Bránění">OB</th>
                          <th className="px-2 py-2 text-center" title="Tvorba hry">TV</th>
                          <th className="px-2 py-2 text-center" title="Křídlo">KŘ</th>
                          <th className="px-2 py-2 text-center" title="Přihrávky">PŘ</th>
                          <th className="px-2 py-2 text-center" title="Zakončování">ZAK</th>
                          <th className="px-2 py-2 text-center" title="Standardní situace">ST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ht-border/50 text-slate-200">
                        {excelPreviewPlayers.map((p) => {
                          const spec = SPECIALTY_LABELS[p.specialty];
                          return (
                            <tr key={p.id} className="hover:bg-ht-card/60 transition">
                              <td className="px-2.5 py-1.5 font-medium text-white whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  {p.motherClubBonus && (
                                    <Heart className="h-3 w-3 fill-rose-500 text-rose-500 inline" />
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono">({p.id})</span>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                {p.nationality ? (
                                  <span className="rounded bg-sky-950/70 border border-sky-600/30 px-1 py-0.5 text-[9px] font-bold text-sky-300">
                                    {p.nationality}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-center whitespace-nowrap">
                                <span className={p.ageYears <= 20 ? 'font-bold text-emerald-400' : 'text-slate-300'}>
                                  {p.ageYears}l {p.ageDays}d
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-center whitespace-nowrap">
                                {p.specialty !== 'None' ? (
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200" title={spec.label}>
                                    {spec.icon} {spec.short}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-center whitespace-nowrap">
                                {p.injuredWeeks > 0 ? (
                                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                                    +{p.injuredWeeks}t
                                  </span>
                                ) : p.injuredWeeks === -1 ? (
                                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                    Náplast
                                  </span>
                                ) : p.cards >= 3 ? (
                                  <span className="rounded bg-red-600/30 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                                    Stopka
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 text-[10px]">OK</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-center whitespace-nowrap">
                                {p.preferredPosition ? (
                                  <span
                                    className="rounded bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300"
                                    title={`Pozice: ${p.preferredPosition}${p.preferredSlot ? ` (${p.preferredSlot})` : ''}${p.preferredOrder ? ` • Pokyn: ${p.preferredOrder}` : ''}`}
                                  >
                                    {p.preferredPosition}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono text-slate-300">
                                {p.tsi.toLocaleString('cs-CZ')}
                              </td>
                              <td className="px-1.5 py-1.5 text-center">
                                <span className={`inline-block min-w-[20px] rounded px-1 py-0.2 font-bold ${getSkillBadgeColor(p.skills.keeper)}`}>
                                  {p.skills.keeper}
                                </span>
                              </td>
                              <td className="px-1.5 py-1.5 text-center">
                                <span className={`inline-block min-w-[20px] rounded px-1 py-0.2 font-bold ${getSkillBadgeColor(p.skills.defending)}`}>
                                  {p.skills.defending}
                                </span>
                              </td>
                              <td className="px-1.5 py-1.5 text-center">
                                <span className={`inline-block min-w-[20px] rounded px-1 py-0.2 font-bold ${getSkillBadgeColor(p.skills.playmaking)}`}>
                                  {p.skills.playmaking}
                                </span>
                              </td>
                              <td className="px-1.5 py-1.5 text-center">
                                <span className={`inline-block min-w-[20px] rounded px-1 py-0.2 font-bold ${getSkillBadgeColor(p.skills.winger)}`}>
                                  {p.skills.winger}
                                </span>
                              </td>
                              <td className="px-1.5 py-1.5 text-center">
                                <span className={`inline-block min-w-[20px] rounded px-1 py-0.2 font-bold ${getSkillBadgeColor(p.skills.passing)}`}>
                                  {p.skills.passing}
                                </span>
                              </td>
                              <td className="px-1.5 py-1.5 text-center">
                                <span className={`inline-block min-w-[20px] rounded px-1 py-0.2 font-bold ${getSkillBadgeColor(p.skills.scoring)}`}>
                                  {p.skills.scoring}
                                </span>
                              </td>
                              <td className="px-1.5 py-1.5 text-center">
                                <span className={`inline-block min-w-[20px] rounded px-1 py-0.2 font-bold ${getSkillBadgeColor(p.skills.setPieces)}`}>
                                  {p.skills.setPieces}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExcelPreviewPlayers([]);
                        setExcelFileName('');
                        setExcelText('');
                      }}
                      className="rounded-xl border border-ht-border px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                    >
                      Vyčistit
                    </button>
                    <button
                      onClick={handleConfirmExcelImport}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-950"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Importovat {excelPreviewPlayers.length} hráčů do kádru</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'paste' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-ht-border bg-ht-card/60 p-3 text-xs text-slate-300">
                <p className="font-semibold text-emerald-300">Jak na bleskový import bez API klíče:</p>
                <ol className="mt-1 list-inside list-decimal space-y-1">
                  <li>Na Hattrick.org otevři stránku <strong>Tým → Hráči</strong>.</li>
                  <li>Stiskni <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Ctrl+A</kbd> a <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Ctrl+C</kbd>.</li>
                  <li>Vlož text do pole níže (funguje česky i anglicky, včetně tabulek z Foxtricku/HO).</li>
                </ol>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-emerald-500"
                    />
                    <span>Nahradit celý kádr</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-emerald-500"
                    />
                    <span>Doplnit / aktualizovat existující</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => handleAnalyzePaste(SAMPLE_PASTE_HINT)}
                  className="text-xs font-medium text-emerald-400 hover:underline"
                >
                  Vložit ukázkový formát hráče
                </button>
              </div>

              <textarea
                value={pasteText}
                onChange={(e) => handleAnalyzePaste(e.target.value)}
                rows={7}
                placeholder="Sem vlož zkopírovaný seznam hráčů z Hattrick.org..."
                className="w-full rounded-xl border border-ht-border bg-[#0c1310] p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />

              {previewPlayers.length > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-emerald-300">
                    <span>Rozpoznáno hráčů: {previewPlayers.length}</span>
                    <span>Připraveno k importu</span>
                  </div>
                  <div className="max-h-36 space-y-1 overflow-y-auto text-xs text-slate-200">
                    {previewPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded bg-[#0c1310]/60 px-2.5 py-1"
                      >
                        <span>
                          <strong>{p.name}</strong> ({p.ageYears}l {p.ageDays}d)
                        </span>
                        <span className="text-slate-400">
                          BR:{p.skills.keeper} OB:{p.skills.defending} TV:{p.skills.playmaking} KŘ:
                          {p.skills.winger} PŘ:{p.skills.passing} ZAK:{p.skills.scoring}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleConfirmPaste}
                  disabled={previewPlayers.length === 0}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Importovat {previewPlayers.length > 0 ? `(${previewPlayers.length})` : ''} hráčů
                </button>
              </div>
            </div>
          )}

          {tab === 'chpp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-ht-border bg-ht-card/60 px-4 py-3 text-xs">
                <span className="text-slate-300">Stav lokálního CHPP OAuth serveru:</span>
                {serverOnline ? (
                  <span className="font-semibold text-emerald-400">● Online (port 3001)</span>
                ) : (
                  <span className="font-semibold text-amber-400">
                    ● Offline — spusť aplikaci přes `npm run dev`
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-ht-border bg-[#0c1310]/60 p-3 text-xs text-slate-300">
                <p>
                  Pro přímou OAuth synchronizaci s Hattrick.org získej zdarma Consumer Key a Secret v Hattricku
                  pod <strong>Komunita → CHPP</strong> a vyplň je níže. Tokeny zůstávají jen v tvém prohlížeči.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    CHPP Consumer Key
                  </label>
                  <input
                    type="text"
                    value={consumerKey}
                    onChange={(e) => setConsumerKey(e.target.value)}
                    placeholder="např. xYz123Abc..."
                    className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    CHPP Consumer Secret
                  </label>
                  <input
                    type="password"
                    value={consumerSecret}
                    onChange={(e) => setConsumerSecret(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleRequestToken}
                  disabled={!serverOnline || loadingChpp || !consumerKey || !consumerSecret}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-40"
                >
                  1. Získat autorizační odkaz
                </button>
                {authorizeUrl && (
                  <a
                    href={authorizeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-sky-400 underline"
                  >
                    Otevřít přihlášení na Hattrick.org →
                  </a>
                )}
              </div>

              {requestToken && (
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ht-border bg-ht-card/40 p-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-slate-300">
                      Ověřovací kód (PIN) z Hattricku
                    </label>
                    <input
                      type="text"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="Vlož kód z obrazovky Hattricku..."
                      className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <button
                    onClick={handleVerifyPin}
                    disabled={loadingChpp || !pinCode}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                  >
                    2. Ověřit PIN
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-ht-border pt-4">
                <div className="text-xs text-slate-400">
                  {chpp.accessToken ? (
                    <span className="text-emerald-400">
                      ✓ Přístupový token uložen{' '}
                      {chpp.lastSyncAt ? `(poslední sync: ${chpp.lastSyncAt})` : ''}
                    </span>
                  ) : (
                    'Zatím není autorizován přístupový token.'
                  )}
                </div>
                <button
                  onClick={handleSyncChpp}
                  disabled={!serverOnline || loadingChpp || !chpp.accessToken}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingChpp ? 'animate-spin' : ''}`} />
                  <span>Synchronizovat kádr & trénink</span>
                </button>
              </div>
            </div>
          )}

          {tab === 'xml' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-ht-border bg-ht-card/50 p-4 text-xs text-slate-300">
                Nahraj oficiální Hattrick XML soubor (např. <code className="text-emerald-300">players.xml</code> stažený přes CHPP nebo Hattrick Organizer / Foxtrick).
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ht-border bg-[#0c1310]/60 py-10 transition hover:border-emerald-500/60">
                <Upload className="h-8 w-8 text-emerald-400" />
                <span className="text-sm font-medium text-slate-200">
                  Vybrat XML soubor s hráči (.xml)
                </span>
                <input
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  onChange={handleXmlUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {tab === 'json' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={handleDownloadJson}
                  className="flex items-center justify-center gap-2 rounded-xl border border-ht-border bg-ht-card px-4 py-3 text-sm font-semibold text-white hover:border-emerald-500/50"
                >
                  <Download className="h-4 w-4 text-emerald-400" />
                  <span>Stáhnout zálohu (.json)</span>
                </button>

                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-ht-border bg-ht-card px-4 py-3 text-sm font-semibold text-white hover:border-emerald-500/50">
                  <Upload className="h-4 w-4 text-sky-400" />
                  <span>Načíst zálohu (.json)</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleJsonUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="border-t border-ht-border pt-4">
                <button
                  onClick={() => {
                    onResetSampleSquad();
                    setStatusMsg({
                      type: 'ok',
                      text: 'Vzorový tým (22 hráčů) byl obnoven.',
                    });
                  }}
                  className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Obnovit výchozí vzorový kádr (22 hráčů)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
