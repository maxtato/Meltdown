import React, { useEffect, useId, useRef } from 'react';
import { getCareerView } from './career';
import type { CareerGoalView, CareerProgress, CareerSnapshot } from './career';
import './career.css';

type Language = 'fr' | 'en' | 'es' | 'it' | 'de' | 'ru' | 'zh';
type GoalCopy = [title: string, hint: string];
interface Copy {
  rewards: string; close: string; paused: string; available: string;
  title: string; claimed: string; ready: string; ongoing: string; received: string;
  claim: string; route: string; phase: string; next: string; complete: string;
  challenge: string; challengesDone: string; endless: string; start: string; startHint: string;
  ice: string; money: string; contracts: string; goal: string;
  goals: Record<string, GoalCopy>;
  challenges: Record<string, GoalCopy>;
}

const COPY: Record<Language, Copy> = {
  fr: {
    rewards: 'Primes', close: 'Fermer les primes', paused: 'Jeu en pause pendant la consultation.', available: 'Primes à récupérer',
    title: 'Ton parcours', claimed: 'primes reçues', ready: 'Prime disponible', ongoing: 'En cours', received: 'Prime reçue',
    claim: 'Réclamer la prime', route: 'Voir le parcours', phase: 'Phase', next: 'À suivre', complete: 'Parcours accompli',
    challenge: 'Défi', challengesDone: 'défis accomplis', endless: 'Les défis se renouvellent après chaque prime. Avance à ton rythme, sans limite de temps.',
    start: 'Lancer les défis', startHint: 'Continue après la victoire avec de nouveaux objectifs de contrats, de livraison et de revenus.',
    ice: 'GL', money: '€', contracts: 'contrats', goal: 'Objectif',
    goals: {
      first_sales: ['Tes premiers clients', 'Vends 40 glaçons au total. La prime finance ton prochain achat.'],
      hire_fred: ['Une paire de mains en plus', 'Recrute Fred pour produire automatiquement.'],
      automate_sales: ['Des ventes sans clic', 'Recrute Brigitte Administrative pour vendre automatiquement.'],
      protect_stock: ['Un stock au frais', 'Achète le Congélateur Pro pour augmenter le stockage et freiner la fonte.'],
      industry: ['Ouvre ton usine', 'Loue un local après l’appel de Robert pour atteindre la phase 2.'],
      first_contract: ['Une promesse tenue', 'Effectue toutes les livraisons d’un contrat pour le terminer.'],
      three_contracts: ['Une activité qui tourne', 'Termine 3 contrats au total.'],
      loyal_client: ['Un client régulier', 'Termine deux contrats avec le même client pour le fidéliser.'],
      brand: ['Fais-toi un nom', 'Achète le Nouveau siège social pour atteindre la phase 3.'],
      awareness: ['Ta marque circule', 'Atteins 60 de notoriété grâce à ta marque et tes campagnes.'],
      retail_network: ['Présent dans les rayons', 'Garde 4 enseignes de distribution différentes sous contrat en même temps.'],
      domination: ['Prends la première place', 'Remplis tous les objectifs de Domination pour remporter la partie.'],
    },
    challenges: {
      contractsCompleted: ['Les clients comptent sur toi', 'Termine {target} contrats supplémentaires depuis le début de ce défi.'],
      delivered: ['La tournée continue', 'Livre {target} GL supplémentaires depuis le début de ce défi.'],
      moneyEarned: ['Une nouvelle recette', 'Génère {target} € de revenus supplémentaires depuis le début de ce défi.'],
    },
  },
  en: {
    rewards: 'Rewards', close: 'Close rewards', paused: 'The game is paused while you browse.', available: 'Rewards available',
    title: 'Your journey', claimed: 'rewards claimed', ready: 'Reward ready', ongoing: 'In progress', received: 'Reward claimed',
    claim: 'Claim reward', route: 'View journey', phase: 'Phase', next: 'Up next', complete: 'Journey complete',
    challenge: 'Challenge', challengesDone: 'challenges completed', endless: 'A new challenge follows each reward. Progress at your own pace, with no time limit.',
    start: 'Start challenges', startHint: 'Keep playing after victory with new contract, delivery and revenue goals.',
    ice: 'IC', money: '€', contracts: 'contracts', goal: 'Goal',
    goals: {
      first_sales: ['Your first customers', 'Sell 40 ice cubes in total. The reward helps fund your next purchase.'],
      hire_fred: ['An extra pair of hands', 'Hire Fred to produce ice automatically.'],
      automate_sales: ['Sales without clicks', 'Hire Brigitte Admin to sell automatically.'],
      protect_stock: ['Keep your stock cold', 'Buy the Pro Freezer to expand storage and slow melting.'],
      industry: ['Open your factory', 'Rent a warehouse after Robert’s call to reach phase 2.'],
      first_contract: ['A promise kept', 'Make every delivery in a contract to complete it.'],
      three_contracts: ['Business is moving', 'Complete 3 contracts in total.'],
      loyal_client: ['A regular client', 'Complete two contracts for the same client to earn their loyalty.'],
      brand: ['Make a name for yourself', 'Buy the New headquarters to reach phase 3.'],
      awareness: ['Word is getting around', 'Reach 60 awareness through your brand and campaigns.'],
      retail_network: ['On the shelves', 'Keep 4 different retailers under contract at the same time.'],
      domination: ['Take the top spot', 'Meet every Domination objective to win the game.'],
    },
    challenges: {
      contractsCompleted: ['Your clients count on you', 'Complete {target} more contracts from the start of this challenge.'],
      delivered: ['Keep the deliveries coming', 'Deliver {target} more IC from the start of this challenge.'],
      moneyEarned: ['Fresh revenue', 'Generate {target} € more revenue from the start of this challenge.'],
    },
  },
  es: {
    rewards: 'Premios', close: 'Cerrar premios', paused: 'El juego está en pausa mientras los consultas.', available: 'Premios disponibles',
    title: 'Tu recorrido', claimed: 'premios recibidos', ready: 'Premio disponible', ongoing: 'En curso', received: 'Premio recibido',
    claim: 'Recibir premio', route: 'Ver recorrido', phase: 'Fase', next: 'A continuación', complete: 'Recorrido completado',
    challenge: 'Reto', challengesDone: 'retos completados', endless: 'Cada premio abre un nuevo reto. Avanza a tu ritmo, sin límite de tiempo.',
    start: 'Empezar los retos', startHint: 'Tras la victoria, continúa con objetivos de contratos, entregas e ingresos.',
    ice: 'CB', money: '€', contracts: 'contratos', goal: 'Objetivo',
    goals: {
      first_sales: ['Tus primeros clientes', 'Vende 40 cubitos en total. El premio ayuda a financiar tu próxima compra.'],
      hire_fred: ['Un par de manos más', 'Contrata a Fred para producir automáticamente.'],
      automate_sales: ['Ventas sin clics', 'Contrata a Brigitte Administrativa para vender automáticamente.'],
      protect_stock: ['Existencias bien frías', 'Compra el Congelador Pro para ampliar el almacén y reducir el deshielo.'],
      industry: ['Abre tu fábrica', 'Alquila un local tras la llamada de Robert para llegar a la fase 2.'],
      first_contract: ['Una promesa cumplida', 'Realiza todas las entregas de un contrato para completarlo.'],
      three_contracts: ['El negocio marcha', 'Completa 3 contratos en total.'],
      loyal_client: ['Un cliente habitual', 'Completa dos contratos con el mismo cliente para fidelizarlo.'],
      brand: ['Hazte un nombre', 'Compra la Nueva sede social para llegar a la fase 3.'],
      awareness: ['Tu marca se conoce', 'Alcanza 60 de notoriedad con tu marca y tus campañas.'],
      retail_network: ['En los estantes', 'Mantén contratos con 4 distribuidores distintos al mismo tiempo.'],
      domination: ['Llega a lo más alto', 'Cumple todos los objetivos de Dominación para ganar la partida.'],
    },
    challenges: {
      contractsCompleted: ['Tus clientes cuentan contigo', 'Completa {target} contratos más desde el inicio de este reto.'],
      delivered: ['La ruta continúa', 'Entrega {target} CB más desde el inicio de este reto.'],
      moneyEarned: ['Nuevos ingresos', 'Genera {target} € más de ingresos desde el inicio de este reto.'],
    },
  },
  it: {
    rewards: 'Premi', close: 'Chiudi i premi', paused: 'Il gioco è in pausa mentre li consulti.', available: 'Premi disponibili',
    title: 'Il tuo percorso', claimed: 'premi riscossi', ready: 'Premio disponibile', ongoing: 'In corso', received: 'Premio riscosso',
    claim: 'Riscuoti il premio', route: 'Vedi il percorso', phase: 'Fase', next: 'Prossimi obiettivi', complete: 'Percorso completato',
    challenge: 'Sfida', challengesDone: 'sfide completate', endless: 'Ogni premio apre una nuova sfida. Avanza al tuo ritmo, senza limiti di tempo.',
    start: 'Inizia le sfide', startHint: 'Dopo la vittoria, continua con nuovi obiettivi di contratti, consegne e ricavi.',
    ice: 'CB', money: '€', contracts: 'contratti', goal: 'Obiettivo',
    goals: {
      first_sales: ['I tuoi primi clienti', 'Vendi 40 cubetti in totale. Il premio aiuta a finanziare il prossimo acquisto.'],
      hire_fred: ['Due mani in più', 'Assumi Fred per produrre automaticamente.'],
      automate_sales: ['Vendite senza clic', 'Assumi Brigitte Amministrativa per vendere automaticamente.'],
      protect_stock: ['Scorte al fresco', 'Compra il Congelatore Pro per ampliare lo spazio e ridurre lo scioglimento.'],
      industry: ['Apri la tua fabbrica', 'Affitta un magazzino dopo la chiamata di Robert per raggiungere la fase 2.'],
      first_contract: ['Una promessa mantenuta', 'Effettua tutte le consegne di un contratto per completarlo.'],
      three_contracts: ['Gli affari vanno avanti', 'Completa 3 contratti in totale.'],
      loyal_client: ['Un cliente abituale', 'Completa due contratti con lo stesso cliente per fidelizzarlo.'],
      brand: ['Fatti un nome', 'Compra la Nuova sede per raggiungere la fase 3.'],
      awareness: ['Il marchio si diffonde', 'Raggiungi 60 di notorietà grazie al marchio e alle campagne.'],
      retail_network: ['Sugli scaffali', 'Mantieni contratti con 4 distributori diversi contemporaneamente.'],
      domination: ['Conquista la vetta', 'Raggiungi tutti gli obiettivi di Dominazione per vincere la partita.'],
    },
    challenges: {
      contractsCompleted: ['I clienti contano su di te', 'Completa altri {target} contratti dall’inizio di questa sfida.'],
      delivered: ['Il giro continua', 'Consegna altri {target} CB dall’inizio di questa sfida.'],
      moneyEarned: ['Nuovi ricavi', 'Genera altri {target} € di ricavi dall’inizio di questa sfida.'],
    },
  },
  de: {
    rewards: 'Prämien', close: 'Prämien schließen', paused: 'Das Spiel pausiert, während du die Prämien ansiehst.', available: 'Verfügbare Prämien',
    title: 'Dein Weg', claimed: 'Prämien erhalten', ready: 'Prämie verfügbar', ongoing: 'In Arbeit', received: 'Prämie erhalten',
    claim: 'Prämie abholen', route: 'Weg ansehen', phase: 'Phase', next: 'Als Nächstes', complete: 'Weg abgeschlossen',
    challenge: 'Aufgabe', challengesDone: 'Aufgaben erfüllt', endless: 'Nach jeder Prämie folgt eine neue Aufgabe. Spiele in deinem Tempo, ohne Zeitlimit.',
    start: 'Aufgaben starten', startHint: 'Nach dem Sieg warten neue Ziele für Verträge, Lieferungen und Einnahmen.',
    ice: 'EW', money: '€', contracts: 'Verträge', goal: 'Ziel',
    goals: {
      first_sales: ['Deine ersten Kunden', 'Verkaufe insgesamt 40 Eiswürfel. Die Prämie hilft beim nächsten Kauf.'],
      hire_fred: ['Zwei Hände mehr', 'Stelle Fred ein, um automatisch zu produzieren.'],
      automate_sales: ['Verkäufe ohne Klicks', 'Stelle Brigitte Verwaltung ein, um automatisch zu verkaufen.'],
      protect_stock: ['Das Lager bleibt kalt', 'Kaufe die Profi-Gefriertruhe für mehr Platz und langsameres Schmelzen.'],
      industry: ['Eröffne deine Fabrik', 'Miete nach Roberts Anruf ein Lager, um Phase 2 zu erreichen.'],
      first_contract: ['Ein Versprechen gehalten', 'Erfülle alle Lieferungen eines Vertrags, um ihn abzuschließen.'],
      three_contracts: ['Das Geschäft läuft', 'Schließe insgesamt 3 Verträge erfolgreich ab.'],
      loyal_client: ['Ein Stammkunde', 'Erfülle zwei Verträge für denselben Kunden, um seine Treue zu gewinnen.'],
      brand: ['Mach dir einen Namen', 'Kaufe die Neue Firmenzentrale, um Phase 3 zu erreichen.'],
      awareness: ['Deine Marke wird bekannt', 'Erreiche 60 Bekanntheit durch deine Marke und Kampagnen.'],
      retail_network: ['In den Regalen', 'Halte gleichzeitig Verträge mit 4 verschiedenen Handelsketten.'],
      domination: ['Erobere die Spitze', 'Erfülle alle Dominanzziele, um das Spiel zu gewinnen.'],
    },
    challenges: {
      contractsCompleted: ['Die Kunden zählen auf dich', 'Erfülle seit Beginn dieser Aufgabe {target} weitere Verträge.'],
      delivered: ['Die Tour geht weiter', 'Liefere seit Beginn dieser Aufgabe {target} weitere EW.'],
      moneyEarned: ['Neue Einnahmen', 'Erziele seit Beginn dieser Aufgabe {target} € zusätzliche Einnahmen.'],
    },
  },
  ru: {
    rewards: 'Награды', close: 'Закрыть награды', paused: 'Игра на паузе, пока ты смотришь награды.', available: 'Доступные награды',
    title: 'Твой путь', claimed: 'наград получено', ready: 'Награда доступна', ongoing: 'В процессе', received: 'Награда получена',
    claim: 'Забрать награду', route: 'Посмотреть путь', phase: 'Этап', next: 'Далее', complete: 'Путь пройден',
    challenge: 'Испытание', challengesDone: 'испытаний пройдено', endless: 'После каждой награды появляется новое испытание. Играй в своём темпе, без ограничения времени.',
    start: 'Начать испытания', startHint: 'После победы продолжай выполнять новые цели по контрактам, доставкам и доходам.',
    ice: 'К', money: '€', contracts: 'контрактов', goal: 'Цель',
    goals: {
      first_sales: ['Твои первые клиенты', 'Продай всего 40 кубиков льда. Награда поможет оплатить следующую покупку.'],
      hire_fred: ['Ещё одна пара рук', 'Найми Фреда для автоматического производства.'],
      automate_sales: ['Продажи без кликов', 'Найми Брижит-администратора для автоматических продаж.'],
      protect_stock: ['Запасы в холоде', 'Купи Про-морозильник, чтобы увеличить склад и замедлить таяние.'],
      industry: ['Открой завод', 'Арендуй склад после звонка Робера, чтобы перейти к этапу 2.'],
      first_contract: ['Обещание выполнено', 'Выполни все доставки по контракту, чтобы завершить его.'],
      three_contracts: ['Дело идёт', 'Успешно заверши всего 3 контракта.'],
      loyal_client: ['Постоянный клиент', 'Заверши два контракта с одним клиентом, чтобы заслужить его лояльность.'],
      brand: ['Создай себе имя', 'Купи новую штаб-квартиру, чтобы перейти к этапу 3.'],
      awareness: ['О марке говорят', 'Достигни 60 известности с помощью бренда и рекламных кампаний.'],
      retail_network: ['На полках магазинов', 'Поддерживай контракты с 4 разными торговыми сетями одновременно.'],
      domination: ['Займи первое место', 'Выполни все цели Доминирования, чтобы победить.'],
    },
    challenges: {
      contractsCompleted: ['Клиенты рассчитывают на тебя', 'Заверши ещё {target} контрактов с начала этого испытания.'],
      delivered: ['Маршрут продолжается', 'Доставь ещё {target} К с начала этого испытания.'],
      moneyEarned: ['Новые доходы', 'Получи ещё {target} € дохода с начала этого испытания.'],
    },
  },
  zh: {
    rewards: '奖励', close: '关闭奖励', paused: '查看奖励期间，游戏暂停。', available: '可领取奖励',
    title: '你的成长之路', claimed: '份奖励已领取', ready: '奖励可领取', ongoing: '进行中', received: '奖励已领取',
    claim: '领取奖励', route: '查看成长之路', phase: '阶段', next: '接下来的目标', complete: '成长之路已完成',
    challenge: '挑战', challengesDone: '项挑战已完成', endless: '每次领取奖励后都会开启新挑战。没有时间限制，按自己的节奏推进。',
    start: '开启挑战', startHint: '胜利之后，继续完成合同、配送和收入方面的新目标。',
    ice: '冰块', money: '€', contracts: '份合同', goal: '目标',
    goals: {
      first_sales: ['第一批顾客', '累计售出40块冰。用奖励资助下一次购买。'],
      hire_fred: ['多一双帮手', '雇用弗雷德，开始自动生产。'],
      automate_sales: ['销售无需点击', '雇用行政人员布丽吉特，开始自动销售。'],
      protect_stock: ['库存保持冰冷', '购买专业冷冻柜，扩大储存空间并减缓融化。'],
      industry: ['开办工厂', '接到罗伯特的电话后租用仓库，进入阶段2。'],
      first_contract: ['兑现承诺', '完成一份合同中的所有配送，履行合同。'],
      three_contracts: ['生意步入正轨', '累计完成3份合同。'],
      loyal_client: ['一位常客', '与同一位客户完成两份合同，赢得其忠诚。'],
      brand: ['打响名号', '购买新总部，进入阶段3。'],
      awareness: ['品牌广为人知', '通过品牌建设和宣传活动，让知名度达到60。'],
      retail_network: ['走上货架', '同时与4家不同的零售商保持合同。'],
      domination: ['登上榜首', '完成全部称霸目标，赢得游戏。'],
    },
    challenges: {
      contractsCompleted: ['客户信赖你', '从本次挑战开始，再完成{target}份合同。'],
      delivered: ['配送继续', '从本次挑战开始，再配送{target}块冰。'],
      moneyEarned: ['新的收入', '从本次挑战开始，再获得{target}欧元收入。'],
    },
  },
};

const LOCALES: Record<Language, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', de: 'de-DE', ru: 'ru-RU', zh: 'zh-CN' };

export interface CareerPanelProps {
  snapshot: CareerSnapshot;
  progress: CareerProgress;
  onClaim: (id: string) => void;
  language: string;
}

export interface CareerLauncherProps extends CareerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The parent pauses the simulation whenever this controlled dialog is open. */
export function CareerLauncher({ open, onOpenChange, ...panelProps }: CareerLauncherProps) {
  const lang: Language = Object.prototype.hasOwnProperty.call(COPY, panelProps.language) ? panelProps.language as Language : 'fr';
  const copy = COPY[lang];
  const view = getCareerView(panelProps.snapshot, panelProps.progress);
  const readyCount = view.goals.filter(goal => goal.complete && !goal.claimed).length
    + (view.featured?.kind === 'challenge' && view.featured.complete ? 1 : 0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <div className="career-launcher-row">
    <button
      ref={launcherRef}
      type="button"
      className={`career-launcher${readyCount > 0 ? ' career-launcher-ready' : ''}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={dialogId}
      onClick={() => onOpenChange(true)}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 3h8v5a4 4 0 0 1-8 0V3Z" />
        <path d="M8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v6m-4 3v-3h8v3M6 21h12" />
      </svg>
      <span>{copy.rewards}</span>
      {readyCount > 0 && <span className="career-launcher-badge" aria-label={`${copy.available} : ${readyCount}`}>{readyCount}</span>}
    </button>
    <dialog
      ref={dialogRef}
      id={dialogId}
      className="career-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); onOpenChange(false); }}
      onClose={() => { onOpenChange(false); launcherRef.current?.focus({ preventScroll: true }); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onOpenChange(false);
      }}
    >
      <div className="career-dialog-header">
        <div>
          <h2 id={titleId}>{copy.rewards}</h2>
          <p id={descriptionId}>{copy.paused}</p>
        </div>
        <button type="button" className="career-dialog-close" aria-label={copy.close} onClick={() => onOpenChange(false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      {open && <CareerPanel {...panelProps} />}
    </dialog>
  </div>;
}

export function CareerPanel({ snapshot, progress, onClaim, language }: CareerPanelProps) {
  const lang: Language = Object.prototype.hasOwnProperty.call(COPY, language) ? language as Language : 'fr';
  const copy = COPY[lang];
  const format = (n: number) => Math.floor(n).toLocaleString(LOCALES[lang]);
  const view = getCareerView(snapshot, progress);
  const featured = view.featured;
  const content = (goal: CareerGoalView): GoalCopy => {
    if (goal.kind === 'start') return [copy.start, copy.startHint];
    if (goal.kind === 'challenge') {
      const [title, hint] = copy.challenges[goal.metric!];
      return [title, hint.replace('{target}', format(goal.target))];
    }
    return copy.goals[goal.id];
  };
  const progressText = (goal: CareerGoalView) => {
    const unit = goal.metric === 'moneyEarned' ? copy.money : goal.metric === 'delivered' || goal.id === 'first_sales' ? copy.ice
      : goal.metric === 'contractsCompleted' ? copy.contracts : '';
    return `${format(goal.current)} / ${format(goal.target)}${unit ? ` ${unit}` : ''}`;
  };

  return <section className="career-panel" aria-label={copy.title}>
    <div className="career-heading">
      <span className="career-kicker">{view.postgame ? `${copy.challenge} ${format(view.challengeCount + 1)}` : copy.title}</span>
      <span className="career-count">{view.postgame ? `${format(view.challengeCount)} ${copy.challengesDone}` : `${view.claimedCount}/${view.totalCount} ${copy.claimed}`}</span>
    </div>

    {featured ? <div className={`career-featured${featured.complete ? ' career-ready' : ''}`}>
      <div className="career-featured-heading">
        <h2>{content(featured)[0]}</h2>
        {featured.reward > 0 && <span className="career-reward">+{format(featured.reward)} €</span>}
      </div>
      <p className="career-hint">{content(featured)[1]}</p>
      {featured.kind !== 'start' && <>
        <div className="career-progress-meta">
          <span aria-live="polite">{featured.complete ? copy.ready : copy.ongoing}</span>
          <span>{progressText(featured)}</span>
        </div>
        <progress className="career-progress" value={featured.current} max={featured.target} aria-label={`${copy.goal}: ${content(featured)[0]}`} />
      </>}
      {featured.complete && <button type="button" className="career-claim" onClick={() => onClaim(featured.id)}>
        {featured.kind === 'start' ? copy.start : copy.claim}
        <span aria-hidden="true">→</span>
      </button>}
    </div> : <p className="career-finished">{copy.complete}</p>}

    {view.postgame ? <p className="career-endless">{copy.endless}</p> : view.next.length > 0 && <div className="career-next">
      <span>{copy.next}</span>
      <span>{content(view.next[0])[0]}</span>
    </div>}

    <details className="career-details">
      <summary>{copy.route}<span aria-hidden="true">{view.claimedCount}/{view.totalCount}</span></summary>
      <ol className="career-route">
        {view.goals.map(goal => <li key={goal.id} className={goal.claimed ? 'career-goal-claimed' : goal.complete ? 'career-goal-ready' : ''}>
          <span className="career-goal-number" aria-hidden="true">{goal.claimed ? '✓' : String(view.goals.indexOf(goal) + 1).padStart(2, '0')}</span>
          <div className="career-goal-body">
            <div className="career-goal-title">{content(goal)[0]}</div>
            <p className="career-goal-hint">{content(goal)[1]}</p>
            <div className="career-goal-meta"><span>{copy.phase} {goal.phase} · {goal.claimed ? copy.received : goal.complete ? copy.ready : progressText(goal)}</span><span>+{format(goal.reward)} €</span></div>
          </div>
        </li>)}
      </ol>
    </details>
  </section>;
}

export default CareerPanel;
