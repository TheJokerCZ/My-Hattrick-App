# MyHattrick ⚽

[![Firebase Hosting](https://img.shields.io/badge/Hosted%20on-Firebase%20Hosting-orange?logo=firebase)](https://myhattrick.web.app)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-teal?logo=tailwindcss)](https://tailwindcss.com/)

**MyHattrick** je komplexní taktický poradce, plánovač tréninku a optimalizátor sestavy pro online fotbalového manažera [Hattrick.org](https://www.hattrick.org).

🌐 **Živá aplikace:** [https://myhattrick.web.app](https://myhattrick.web.app)

---

## 🚀 Hlavní funkce

1. **Import kádru & Synchronizace:**
   * **Bleskový Copy-Paste z webu:** Stačí na Hattricku označit stránku *Hráči* (`Ctrl+A`, `Ctrl+C`) a vložit. Aplikace automaticky rozpozná jména, věk, TSI, formu, kondici, dovednosti, speciality a odchovance (CZ i EN).
   * **Oficiální Hattrick CHPP OAuth 1.0a:** Lokální proxy server pro přímé stažení dat z Hattrick API.
   * **Hattrick XML & JSON zálohy:** Nahrání `players.xml` nebo export/import vlastní databáze.

2. **Automatický tréninkový poradce & Talent Scouting:**
   * **Prospect Score (0–100):** Algoritmus hodnotící věk (17–21 let), hlavní dovednosti, multiskill potenciál a speciality.
   * **Hodnocení všech 8 tréninků:** Doporučení nejlepšího typu tréninku na míru aktuální soupisce.
   * **Týdenní rozvrh slotů:** Rozdělení talentů na 100% ligové sloty (neděle), 100% přátelské sloty (středa) a 50% vedlejší sloty.
   * **Kalkulačka rychlosti:** Odhad týdnů do zvýšení úrovně a doporučený podíl kondice (`Stamina Share %`).

3. **Optimalizátor sestavy & 2D interaktivní hřiště:**
   * Analýza všech formací (`3-5-2`, `4-4-2`, `2-5-3`, `3-4-3`, `4-5-1`, `5-3-2`, `5-4-1`, `5-2-3`, `4-3-3`).
   * Zámek pro trénované talenty – sestava garantuje 100% tréninkový přísun pro vybrané mladíky a zbytek týmu maximalizuje šanci na výhru.
   * Automatické individuální pokyny (*Normální, Ofenzivní, Defenzivní, Doprostřed, K lajně*), týmová taktika (*AIM, AOW, CA, Presink*), kapitán, standardkář a střídání na únavu (60.–72. minuta).
   * Kliknutím na hráče na 2D hřišti lze okamžitě změnit pokyn či vyměnit hráče se živým přepočtem šancí na výhru.

4. **Zápasový simulátor & Scouting soupeře:**
   * Exaktní kubický vzorec Hattricku pro šanci na gól v každém ze 7 sektorů:
     $$P(\text{gól}) = \frac{0.74 \times \text{Útok}^3}{0.74 \times \text{Útok}^3 + \text{Obrana}^3}$$
   * Výpočet držení míče, distribuce šancí, brejků (CA), speciálních událostí (SE) a Poissonovy matice výsledků (Výhra / Remíza / Prohra %, xG a očekávané body xPts).

---

## 🛠️ Spuštění projektu lokálně

```bash
# Instalace závislostí
npm install

# Spuštění klienta i CHPP proxy serveru
npm run dev

# Spuštění testů (Vitest)
npm test

# Produkční sestavení
npm run build
```
