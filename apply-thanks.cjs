// Applique les nouveaux remerciements (FR fournis par le joueur, traduits en
// 7 langues) à UPGRADE_THANKS dans meltdown.tsx. Surgical : on remplace les
// entrées existantes et on insère les nouvelles ; on ne touche pas aux thanks
// non-personnage (voisin_jacques, salle_blanche, etc.).

const fs = require('fs');
const SRC_PATH = 'meltdown.tsx';

// Speaker mapping
const speaker = (id) => {
  if (id.startsWith('fred')) return 'Fred';
  if (id.startsWith('brigitte') || id === 'autosell') return 'Brigitte';
  if (id.startsWith('camion')) return 'Lenny';
  if (id.startsWith('janice')) return 'Janice';
  if (id.startsWith('karen')) return 'Karen';
  if (id.startsWith('mark')) return 'Mark';
  if (id.startsWith('sabine')) return 'Sabine';
  return '?';
};

// === DONNÉES : 28 entrées, 7 langues chacune ===
const THANKS = {
  fred_stage: {
    fr: "Patron, merci pour la confiance. Je précise que je suis stagiaire non rémunéré devant une machine qui fait plus de bruit que mon avenir. 18 glaçons toutes les 4 secondes. Je vais appeler ça une carrière.",
    en: "Boss, thanks for the trust. For the record, I'm an unpaid intern in front of a machine that makes more noise than my future. 18 ice cubes every 4 seconds. I'll call that a career.",
    es: "Jefe, gracias por la confianza. Aclaro: soy becario sin sueldo frente a una máquina que hace más ruido que mi futuro. 18 cubitos cada 4 segundos. Lo voy a llamar una carrera.",
    zh: "老板，谢谢您的信任。我先说清楚：我是无薪实习生，面前这台机器比我的未来还吵。每4秒出18块冰。我打算把这叫做一段事业。",
    ru: "Шеф, спасибо за доверие. Уточняю: я неоплачиваемый стажёр перед машиной, которая шумит громче, чем моё будущее. 18 кубиков каждые 4 секунды. Назову это карьерой.",
    it: "Capo, grazie per la fiducia. Preciso: sono uno stagista non pagato davanti a una macchina che fa più rumore del mio futuro. 18 cubetti ogni 4 secondi. Lo chiamerò una carriera.",
    de: "Chef, danke für das Vertrauen. Zur Klarstellung: Ich bin unbezahlter Praktikant vor einer Maschine, die mehr Lärm macht als meine Zukunft. 18 Eiswürfel alle 4 Sekunden. Ich nenne das eine Karriere.",
  },
  fred: {
    fr: "Embauché. Officiel. J'ai signé un vrai contrat et la machine m'a reconnu comme l'un des siens. 20 glaçons toutes les 4 secondes. Je ne sais pas si je progresse ou si je deviens un accessoire.",
    en: "Hired. Official. I signed a real contract and the machine recognized me as one of its own. 20 ice cubes every 4 seconds. I'm not sure if I'm progressing or becoming an accessory.",
    es: "Contratado. Oficial. Firmé un contrato de verdad y la máquina me ha reconocido como uno de los suyos. 20 cubitos cada 4 segundos. No sé si avanzo o si me convierto en un accesorio.",
    zh: "正式入职。签了真合同，机器把我认作了自己人。每4秒出20块冰。我分不清是在升职，还是在变成它的配件。",
    ru: "Принят. Официально. Подписал настоящий контракт, и машина признала меня своим. 20 кубиков каждые 4 секунды. Не уверен, расту я или становлюсь её аксессуаром.",
    it: "Assunto. Ufficiale. Ho firmato un vero contratto e la macchina mi ha riconosciuto come uno dei suoi. 20 cubetti ogni 4 secondi. Non so se sto progredendo o diventando un accessorio.",
    de: "Eingestellt. Offiziell. Ich habe einen echten Vertrag unterschrieben, und die Maschine hat mich als einen der ihren anerkannt. 20 Eiswürfel alle 4 Sekunden. Ich weiß nicht, ob ich vorankomme oder zu einem Zubehör werde.",
  },
  fred_perma: {
    fr: "Senior, déjà. J'ai survécu aux cycles, aux bacs, aux bruits suspects et à la pause de 11h que personne ne prend. 36 glaçons toutes les 3 secondes. Je commence à penser en cubes.",
    en: "Senior already. I've survived the cycles, the trays, the suspicious noises and the 11am break nobody takes. 36 ice cubes every 3 seconds. I'm starting to think in cubes.",
    es: "Sénior, ya. He sobrevivido a los ciclos, las cubeteras, los ruidos sospechosos y la pausa de las 11 que nadie hace. 36 cubitos cada 3 segundos. Empiezo a pensar en cubos.",
    zh: "已经是高级了。我熬过了循环、冰格、可疑声响，还有那个谁都不休的上午十一点的茶歇。每3秒出36块冰。我开始用方块思考了。",
    ru: "Уже сеньор. Я пережил циклы, лотки, подозрительные звуки и одиннадцатичасовой перерыв, который никто не берёт. 36 кубиков каждые 3 секунды. Начинаю мыслить кубиками.",
    it: "Senior, già. Ho sopravvissuto ai cicli, alle vaschette, ai rumori sospetti e alla pausa delle 11 che nessuno prende. 36 cubetti ogni 3 secondi. Comincio a pensare in cubetti.",
    de: "Senior, schon. Ich habe die Zyklen überlebt, die Schalen, die verdächtigen Geräusche und die 11-Uhr-Pause, die niemand macht. 36 Eiswürfel alle 3 Sekunden. Ich fange an, in Würfeln zu denken.",
  },
  fred_chef: {
    fr: "Chef d'atelier. Très bien. Je vais manager la production avec calme, méthode et un regard fixe vers les machines. 49 glaçons toutes les 2,5 secondes. Les nouveaux auront droit à une formation complète, silence compris.",
    en: "Workshop manager. Very well. I'll manage production with calm, method and a fixed stare at the machines. 49 ice cubes every 2.5 seconds. The newcomers will get a full training, silence included.",
    es: "Jefe de taller. Muy bien. Voy a gestionar la producción con calma, método y una mirada fija hacia las máquinas. 49 cubitos cada 2,5 segundos. Los novatos recibirán una formación completa, silencio incluido.",
    zh: "车间主任。好。我会带着冷静、方法和对机器的凝视去管理生产。每2.5秒出49块冰。新人能得到一套完整培训，连沉默也包含在内。",
    ru: "Начальник цеха. Очень хорошо. Я буду руководить производством спокойно, методично, не отрывая взгляда от машин. 49 кубиков каждые 2,5 секунды. Новенькие получат полноценное обучение, включая тишину.",
    it: "Capo officina. Molto bene. Gestirò la produzione con calma, metodo e uno sguardo fisso verso le macchine. 49 cubetti ogni 2,5 secondi. I nuovi avranno diritto a una formazione completa, silenzio compreso.",
    de: "Werkstattleiter. Sehr gut. Ich werde die Produktion mit Ruhe, Methode und einem fixierten Blick auf die Maschinen managen. 49 Eiswürfel alle 2,5 Sekunden. Die Neuen bekommen eine vollständige Ausbildung, Schweigen inklusive.",
  },
  fred_dir: {
    fr: "Directeur des Opérations. Ça fait sérieux, surtout pour quelqu'un qui passe encore ses journées à écouter du froid travailler. 66 glaçons toutes les 2 secondes. Toute l'équipe suit la cadence, même ceux qui regrettent.",
    en: "Director of Operations. Sounds serious, especially for someone who still spends his days listening to cold at work. 66 ice cubes every 2 seconds. The whole team keeps the cadence, even those who regret it.",
    es: "Director de Operaciones. Suena serio, sobre todo para alguien que sigue pasando los días escuchando trabajar al frío. 66 cubitos cada 2 segundos. Todo el equipo sigue el ritmo, incluso los que se arrepienten.",
    zh: "运营总监。听着挺正式，尤其是对一个还在天天听冷气干活的人来说。每2秒出66块冰。整个团队跟得上节奏，连那些后悔的人也跟着。",
    ru: "Директор по операциям. Звучит солидно, особенно для того, кто всё ещё слушает работу холода целыми днями. 66 кубиков каждые 2 секунды. Вся команда держит темп — даже те, кто жалеет.",
    it: "Direttore delle Operazioni. Suona serio, soprattutto per uno che passa ancora le giornate ad ascoltare lavorare il freddo. 66 cubetti ogni 2 secondi. Tutta la squadra tiene la cadenza, anche quelli che se ne pentono.",
    de: "Operations Director. Klingt seriös, besonders für jemanden, der seine Tage immer noch damit verbringt, der Kälte beim Arbeiten zuzuhören. 66 Eiswürfel alle 2 Sekunden. Das ganze Team hält die Taktung, auch die, die es bereuen.",
  },
  fred_legende: {
    fr: "Légende. Je ne sais pas qui a validé ce titre, mais il est gravé sur une plaque et personne ne discute avec une plaque. 7 lignes tournent sous mes yeux. Les glaçons sortent, les candidats arrivent, mon café gèle avant la pause.",
    en: "Legend. I don't know who signed off on this title, but it's engraved on a plaque and no one argues with a plaque. 7 lines run under my eyes. Ice cubes come out, candidates show up, my coffee freezes before the break.",
    es: "Leyenda. No sé quién validó este título, pero está grabado en una placa y con una placa nadie discute. 7 líneas giran ante mis ojos. Salen cubitos, llegan candidatos, mi café se congela antes de la pausa.",
    zh: "传奇。我不知道是谁批了这个头衔，但它已经刻在牌子上，没人会跟一块牌子争。我眼前有7条线在转。冰块出，应聘者来，我的咖啡在休息前先冻上了。",
    ru: "Легенда. Не знаю, кто утвердил этот титул, но он выгравирован на табличке, а с табличкой никто не спорит. У меня перед глазами крутятся 7 линий. Кубики выходят, кандидаты приходят, мой кофе замерзает раньше перерыва.",
    it: "Leggenda. Non so chi abbia approvato questo titolo, ma è inciso su una targa e con una targa nessuno discute. 7 linee girano davanti ai miei occhi. I cubetti escono, i candidati arrivano, il mio caffè si congela prima della pausa.",
    de: "Legende. Ich weiß nicht, wer diesen Titel abgesegnet hat, aber er steht auf einer Plakette, und mit einer Plakette diskutiert niemand. 7 Linien laufen unter meinen Augen. Die Eiswürfel kommen raus, Bewerber tauchen auf, mein Kaffee gefriert noch vor der Pause.",
  },
  autosell: {
    fr: "Très bien, je prends l'administratif. À partir de maintenant, quand le stock déborde, je vends avant que tout fonde et que tu appelles ça une stratégie. Je surveille les 90 %. Tu peux continuer à appuyer sur des boutons, je ferai le reste.",
    en: "Very well, I'll take the admin. From now on, when stock overflows, I sell before everything melts and you call it a strategy. I watch the 90%. You can keep pressing buttons, I'll do the rest.",
    es: "Muy bien, me encargo del administrativo. A partir de ahora, cuando el stock se desborde, vendo antes de que todo se funda y tú lo llames una estrategia. Vigilo el 90 %. Tú sigue pulsando botones, yo me ocupo del resto.",
    zh: "好，行政交给我。从现在起，库存一爆，我就抢在一切融化、你把它叫作策略之前卖掉。我盯着90%。你继续按你的按钮，剩下的我来。",
    ru: "Хорошо, я беру административку. С этого момента, когда склад переполняется, я продаю прежде, чем всё растает и ты назовёшь это стратегией. Слежу за 90 %. Ты продолжай жать кнопки — остальное на мне.",
    it: "Bene, prendo l'amministrazione. D'ora in poi, quando lo stock straripa, vendo prima che tutto si sciolga e tu lo chiami una strategia. Sorveglio il 90%. Tu continua a premere bottoni, al resto penso io.",
    de: "Sehr gut, ich übernehme die Verwaltung. Ab jetzt verkaufe ich, sobald das Lager überquillt, bevor alles schmilzt und du es Strategie nennst. Ich behalte die 90 % im Auge. Drück du weiter Knöpfe, den Rest mache ich.",
  },
  brigitte_compta: {
    fr: "Comptable. Parfait. Contrats Niveau 4 à 6 ouverts, comptes propres, colonnes alignées. Si une erreur existe, je la trouverai. Si elle n'existe pas, je créerai une ligne pour la surveiller.",
    en: "Accountant. Perfect. Tier 4-6 contracts open, clean books, aligned columns. If an error exists, I'll find it. If it doesn't, I'll create a line to watch over it.",
    es: "Contable. Perfecto. Contratos de Nivel 4 a 6 abiertos, cuentas limpias, columnas alineadas. Si hay un error, lo encontraré. Si no lo hay, crearé una línea para vigilarlo.",
    zh: "会计。完美。4–6级合同打开，账目清爽，列对齐。如果有错，我会找出来。如果没有，我也会单独建一行盯着。",
    ru: "Бухгалтер. Отлично. Контракты Уровня 4-6 открыты, счета в порядке, колонки выровнены. Если ошибка есть, я её найду. Если нет — заведу строку, чтобы за ней присматривать.",
    it: "Contabile. Perfetto. Contratti di Livello 4-6 aperti, conti puliti, colonne allineate. Se esiste un errore, lo troverò. Se non esiste, creerò una riga per sorvegliarlo.",
    de: "Buchhalterin. Perfekt. Verträge Stufe 4 bis 6 offen, saubere Konten, ausgerichtete Spalten. Wenn ein Fehler existiert, finde ich ihn. Wenn nicht, lege ich eine Zeile an, um ihn zu überwachen.",
  },
  brigitte_ad: {
    fr: "Assistante de Direction. On quitte la petite paperasse, on entre dans la salle où les gens parlent fort avec des dossiers fins. Contrats premium ouverts, marge +5 %. Je veux être consultée avant les idées brillantes.",
    en: "Executive Assistant. We're leaving the small paperwork behind, entering the room where people speak loud with thin folders. Premium contracts open, +5% margin. I want to be consulted before the brilliant ideas.",
    es: "Asistente de Dirección. Dejamos atrás el papeleo menor, entramos en la sala donde la gente habla alto con expedientes finos. Contratos premium abiertos, margen +5 %. Quiero que se me consulte antes de las ideas brillantes.",
    zh: "执行助理。小杂事就到这儿了，我们进了那种夹着薄文件、说话大声的房间。高端合同打开，利润+5%。下次有「绝妙主意」之前，先咨询我。",
    ru: "Помощник директора. Мелкая бумажная работа позади, мы входим в комнату, где люди говорят громко с тонкими папками. Премиум-контракты открыты, маржа +5 %. Я хочу, чтобы со мной советовались до гениальных идей.",
    it: "Assistente di Direzione. Lasciamo le piccole scartoffie, entriamo nella stanza dove la gente parla forte con cartelle sottili. Contratti premium aperti, margine +5%. Voglio essere consultata prima delle idee brillanti.",
    de: "Direktionsassistentin. Wir lassen den Kleinkram hinter uns und betreten den Raum, in dem Leute laut sprechen mit dünnen Akten. Premium-Verträge offen, Marge +5 %. Ich möchte vor den brillanten Ideen konsultiert werden.",
  },
  brigitte_legende: {
    fr: "Numéro 2. Enfin un titre qui correspond à mon niveau de contrôle réel. Les contrats T7 passent par moi, les clients trop confiants aussi. Prix ×1,10, contrats T7 +30 %. Je signe, je ferme la porte, je dors très bien.",
    en: "Number 2. Finally a title that matches my actual level of control. T7 contracts go through me, so do overconfident clients. Price ×1.10, T7 contracts +30%. I sign, I close the door, I sleep very well.",
    es: "Número 2. Por fin un título a la altura de mi nivel real de control. Los contratos T7 pasan por mí, los clientes demasiado confiados también. Precio ×1,10, contratos T7 +30 %. Firmo, cierro la puerta, duermo muy bien.",
    zh: "二号人物。终于有个职位配得上我实际掌控的程度。T7合同从我手上过，自信过头的客户也一样。价格×1.10，T7合同+30%。签，关门，睡得很好。",
    ru: "Номер два. Наконец-то титул, соответствующий моему реальному уровню контроля. Контракты T7 идут через меня, и слишком самоуверенные клиенты тоже. Цена ×1,10, контракты T7 +30 %. Подписываю, закрываю дверь, сплю отлично.",
    it: "Numero 2. Finalmente un titolo all'altezza del mio reale livello di controllo. I contratti T7 passano da me, anche i clienti troppo sicuri di sé. Prezzo ×1,10, contratti T7 +30%. Firmo, chiudo la porta, dormo benissimo.",
    de: "Nummer 2. Endlich ein Titel, der zu meinem tatsächlichen Kontrollniveau passt. T7-Verträge laufen über mich, übermütige Kunden auch. Preis ×1,10, T7-Verträge +30 %. Ich unterschreibe, ich schließe die Tür, ich schlafe sehr gut.",
  },
  camion_1: {
    fr: "Je suis là, patron. J'ai l'utilitaire, les clés, et une carte routière qui ment moins que certains clients. 50 glaçons par trajet. Bars, brasseries, local. On commence petit, mais on commence roulant.",
    en: "I'm here, boss. I've got the van, the keys, and a road map that lies less than some clients. 50 ice cubes per run. Bars, breweries, local. We start small, but we start rolling.",
    es: "Aquí estoy, jefe. Tengo la furgoneta, las llaves y un mapa de carreteras que miente menos que algunos clientes. 50 cubitos por viaje. Bares, cervecerías, local. Empezamos pequeño, pero empezamos rodando.",
    zh: "我来了，老板。我带着面包车、钥匙，还有一张比某些客户撒谎少得多的路线图。每趟50块冰。酒吧、啤酒厂、本地。规模小，但已经在路上了。",
    ru: "Я тут, шеф. У меня фургон, ключи и дорожная карта, которая врёт меньше некоторых клиентов. 50 кубиков за рейс. Бары, пивоварни, локально. Начинаем по чуть-чуть, но уже на колёсах.",
    it: "Sono qui, capo. Ho il furgone, le chiavi e una mappa stradale che mente meno di certi clienti. 50 cubetti a tratta. Bar, birrerie, locale. Iniziamo piccoli, ma su ruote.",
    de: "Ich bin da, Chef. Ich habe den Transporter, die Schlüssel und eine Straßenkarte, die weniger lügt als manche Kunden. 50 Eiswürfel pro Fahrt. Bars, Brauereien, lokal. Wir fangen klein an, aber wir rollen schon.",
  },
  camion_2: {
    fr: "Chef de Tournée. Très bien. Un vrai 5 tonnes, ça change du véhicule qui tousse dans les ronds points. 250 glaçons par trajet. Deux tournées propres, zéro poésie, beaucoup de frein moteur.",
    en: "Route Manager. Very well. A real 5-tonner, a change from the vehicle that coughs in roundabouts. 250 ice cubes per run. Two clean routes, zero poetry, plenty of engine brake.",
    es: "Jefe de Ruta. Muy bien. Un 5 toneladas de verdad, un cambio respecto al vehículo que tose en las rotondas. 250 cubitos por viaje. Dos rutas limpias, cero poesía, mucho freno motor.",
    zh: "路线经理。好。一辆真正的5吨车，跟那辆在环岛上咳嗽的车不可同日而语。每趟250块冰。两条干净的线路，零浪漫，全是发动机制动。",
    ru: "Начальник маршрутов. Очень хорошо. Настоящая пятитонка — не та машина, что кашляет на кольцевых. 250 кубиков за рейс. Два чистых маршрута, ноль поэзии, много торможения двигателем.",
    it: "Responsabile Tratte. Molto bene. Un vero 5 tonnellate, è un altro mondo rispetto al veicolo che tossiva nelle rotonde. 250 cubetti a tratta. Due tratte pulite, zero poesia, molto freno motore.",
    de: "Tourenleiter. Sehr gut. Ein echter 5-Tonner, das ist eine andere Nummer als das Gefährt, das in Kreisverkehren hustete. 250 Eiswürfel pro Fahrt. Zwei saubere Touren, null Poesie, viel Motorbremse.",
  },
  camion_3: {
    fr: "Responsable Logistique. Là, on parle sérieux. Semi remorque, 3000 glaçons par trajet, festivals, casinos, export. Je vais organiser ça comme un puzzle, sauf que le puzzle pèse plusieurs tonnes.",
    en: "Logistics Lead. Now we're talking serious. Semi-trailer, 3000 ice cubes per run, festivals, casinos, export. I'll organize this like a puzzle, except the puzzle weighs several tons.",
    es: "Responsable de Logística. Ahora hablamos en serio. Semirremolque, 3000 cubitos por viaje, festivales, casinos, exportación. Lo organizo como un puzle, solo que el puzle pesa varias toneladas.",
    zh: "物流主管。这就开始动真格的了。半挂车，每趟3000块冰，节庆、赌场、出口。我会像拼拼图一样安排，只不过这个拼图重好几吨。",
    ru: "Руководитель логистики. Тут уже серьёзно. Полуприцеп, 3000 кубиков за рейс, фестивали, казино, экспорт. Я организую это как пазл, только пазл весит несколько тонн.",
    it: "Capo Logistica. Adesso si fa sul serio. Semirimorchio, 3000 cubetti a tratta, festival, casinò, export. Lo organizzo come un puzzle, solo che pesa diverse tonnellate.",
    de: "Logistikleiter. Jetzt wird es ernst. Sattelzug, 3000 Eiswürfel pro Fahrt, Festivals, Casinos, Export. Ich organisiere das wie ein Puzzle, nur dass das Puzzle mehrere Tonnen wiegt.",
  },
  camion_4: {
    fr: "Directeur Logistique. J'ai un titre de bureau et une âme de cabine. Quatre livraisons en parallèle, ça se pilote avec des tableaux, des cafés froids et un mépris sain pour les embouteillages.",
    en: "Logistics Director. I've got an office title and a cab soul. Four parallel deliveries — that's piloted with spreadsheets, cold coffees, and a healthy contempt for traffic jams.",
    es: "Director Logístico. Tengo un título de oficina y un alma de cabina. Cuatro entregas en paralelo se pilotan con tablas, cafés fríos y un desprecio sano por los atascos.",
    zh: "物流总监。我有办公室头衔和驾驶室灵魂。四单平行配送，靠表格、冷咖啡，以及对堵车的健康鄙视来驾驭。",
    ru: "Директор по логистике. У меня кабинетный титул и душа от кабины. Четыре доставки параллельно — это пилотируется таблицами, холодным кофе и здоровым презрением к пробкам.",
    it: "Direttore Logistica. Ho un titolo da ufficio e un'anima da cabina. Quattro consegne in parallelo si pilotano con tabelle, caffè freddi e un sano disprezzo per gli ingorghi.",
    de: "Logistikdirektor. Ich habe einen Bürotitel und eine Kabinenseele. Vier parallele Lieferungen pilotiert man mit Tabellen, kaltem Kaffee und einer gesunden Verachtung für Staus.",
  },
  camion_5: {
    fr: "Cinquième camion ajouté. On commence à ressembler à une flotte et moins à un voisin qui rend service. 5 livraisons en parallèle. Je vais devoir nommer les camions, sinon je vais m'attacher aux mauvais.",
    en: "Fifth truck added. We're starting to look like a fleet and less like a neighbor doing a favor. 5 parallel deliveries. I'll have to name the trucks — otherwise I'll get attached to the wrong ones.",
    es: "Quinto camión añadido. Empezamos a parecer una flota y menos un vecino que hace un favor. 5 entregas en paralelo. Voy a tener que ponerles nombre a los camiones, si no me encariño con los equivocados.",
    zh: "加了第五辆卡车。我们开始像一支车队，而不是热心帮忙的邻居。5单平行配送。我得开始给卡车起名了，不然会喜欢上不该喜欢的那几辆。",
    ru: "Пятый грузовик добавлен. Начинаем выглядеть как автопарк, а не как сосед, который делает одолжение. 5 доставок параллельно. Придётся дать грузовикам имена — иначе привяжусь не к тем.",
    it: "Quinto camion aggiunto. Cominciamo a sembrare una flotta e meno il vicino che fa un favore. 5 consegne in parallelo. Dovrò dare un nome ai camion, altrimenti mi affeziono a quelli sbagliati.",
    de: "Fünfter LKW dazu. Wir sehen langsam wie eine Flotte aus und weniger wie ein Nachbar, der einen Gefallen tut. 5 parallele Lieferungen. Ich muss den LKWs Namen geben, sonst hänge ich an den falschen.",
  },
  camion_6: {
    fr: "Sixième camion. Là, ce n'est plus une tournée, c'est une migration organisée de glaçons. 6 livraisons en parallèle, 16000 de capacité. Si tout part en même temps, même le planning transpire.",
    en: "Sixth truck. This isn't a route anymore, it's an organized migration of ice cubes. 6 parallel deliveries, 16,000 capacity. If everything leaves at once, even the schedule sweats.",
    es: "Sexto camión. Esto ya no es una ruta, es una migración organizada de cubitos. 6 entregas en paralelo, 16 000 de capacidad. Si todo sale a la vez, hasta la planificación suda.",
    zh: "第六辆卡车。这已经不叫线路了，是冰块的有组织迁徙。6单平行配送，1.6万容量。要是同时出发，连排班表都会冒汗。",
    ru: "Шестой грузовик. Это уже не маршрут — это организованная миграция кубиков. 6 доставок параллельно, ёмкость 16 000. Если всё уходит одновременно, даже расписание потеет.",
    it: "Sesto camion. Non è più una tratta, è una migrazione organizzata di cubetti. 6 consegne in parallelo, 16000 di capacità. Se parte tutto insieme, suda anche il planning.",
    de: "Sechster LKW. Das ist keine Tour mehr, das ist eine organisierte Migration von Eiswürfeln. 6 parallele Lieferungen, 16.000 Kapazität. Wenn alles gleichzeitig losfährt, schwitzt selbst der Plan.",
  },
  janice_jr: {
    fr: "Brand Manager. Enfin une marque à vendre qui n'a pas besoin de promettre le bonheur, seulement du froid. Je vais donner un visage aux glaçons. Sobre, rentable, légèrement inquiétant. Le public ne sait pas encore qu'il nous attend.",
    en: "Brand Manager. Finally a brand to sell that doesn't have to promise happiness — just cold. I'll give the ice cubes a face. Sober, profitable, slightly unsettling. The public doesn't know it's waiting for us yet.",
    es: "Brand Manager. Por fin una marca que vender que no necesita prometer la felicidad, solo el frío. Voy a darles cara a los cubitos. Sobria, rentable, ligeramente inquietante. El público todavía no sabe que nos está esperando.",
    zh: "品牌经理。终于有个不必承诺幸福、只需承诺冷的牌子要卖。我要给冰块一张脸。沉稳、赚钱、略带不安。公众还不知道他们已经在等我们。",
    ru: "Brand Manager. Наконец-то бренд, который не обязан обещать счастье — только холод. Я дам кубикам лицо. Сдержанное, прибыльное, слегка тревожное. Публика ещё не знает, что ждёт именно нас.",
    it: "Brand Manager. Finalmente un marchio da vendere che non deve promettere la felicità, solo il freddo. Darò un volto ai cubetti. Sobrio, redditizio, leggermente inquietante. Il pubblico non sa ancora che ci sta aspettando.",
    de: "Brand Manager. Endlich eine Marke zum Verkaufen, die kein Glück versprechen muss — nur Kälte. Ich gebe den Eiswürfeln ein Gesicht. Nüchtern, rentabel, leicht beunruhigend. Das Publikum weiß noch nicht, dass es auf uns wartet.",
  },
  janice_senior: {
    fr: "Senior. Excellent. Mes campagnes prennent ×1,3 et les deals retail deviennent sérieux. On commence à exister dans des réunions où des gens hochent la tête devant des graphiques parfaitement vides.",
    en: "Senior. Excellent. My campaigns hit ×1.3 and retail deals turn serious. We're starting to exist in meetings where people nod in front of perfectly empty charts.",
    es: "Sénior. Excelente. Mis campañas suben a ×1,3 y los deals retail se vuelven serios. Empezamos a existir en reuniones donde la gente asiente delante de gráficos perfectamente vacíos.",
    zh: "高级。很好。我的活动力达到×1.3，零售合作开始正经起来。我们开始出现在那种大家对着空空如也的图表点头的会议里。",
    ru: "Сеньор. Отлично. Мои кампании выходят на ×1,3, ритейл-сделки становятся серьёзными. Мы начинаем существовать на встречах, где люди кивают перед безупречно пустыми графиками.",
    it: "Senior. Eccellente. Le mie campagne salgono a ×1,3 e i deal retail diventano seri. Cominciamo a esistere in riunioni dove la gente annuisce davanti a grafici perfettamente vuoti.",
    de: "Senior. Hervorragend. Meine Kampagnen erreichen ×1,3 und die Retail-Deals werden ernst. Wir fangen an, in Meetings zu existieren, in denen Leute vor perfekt leeren Diagrammen nicken.",
  },
  janice_dir: {
    fr: "Directrice Marketing. Très bien. Campagnes ×1,6, accès aux géants nationaux. À partir de maintenant, on ne vend plus seulement du froid. On vend une évidence avec un logo.",
    en: "Marketing Director. Very well. Campaigns ×1.6, access to national giants. From now on, we don't just sell cold. We sell an obvious truth with a logo.",
    es: "Directora de Marketing. Muy bien. Campañas ×1,6, acceso a los gigantes nacionales. A partir de ahora ya no vendemos solo frío. Vendemos una evidencia con un logo.",
    zh: "营销总监。好。活动×1.6，可触达全国级巨头。从现在起，我们卖的不再只是冷。我们卖的是带着 logo 的「不言而喻」。",
    ru: "Директор по маркетингу. Очень хорошо. Кампании ×1,6, доступ к национальным гигантам. С этого момента мы продаём не просто холод. Мы продаём очевидность с логотипом.",
    it: "Direttrice Marketing. Molto bene. Campagne ×1,6, accesso ai giganti nazionali. Da ora non vendiamo più solo il freddo. Vendiamo un'ovvietà con un logo.",
    de: "Marketing Director. Sehr gut. Kampagnen ×1,6, Zugang zu den nationalen Giganten. Ab jetzt verkaufen wir nicht nur Kälte. Wir verkaufen eine Selbstverständlichkeit mit Logo.",
  },
  karen_junior: {
    fr: "RH Junior. Je vais commencer par dire bonjour aux gens avant qu'ils ne démissionnent intérieurement. Moral de base à 73. C'est discret, mais dans cette entreprise, discret peut sauver des vies sociales.",
    en: "HR Junior. I'll start by saying hello to people before they resign on the inside. Base morale at 73. It's discreet, but in this company, discreet can save social lives.",
    es: "RRHH Junior. Voy a empezar diciendo hola a la gente antes de que dimitan por dentro. Moral base a 73. Es discreto, pero en esta empresa lo discreto puede salvar vidas sociales.",
    zh: "人事初级。我先从跟同事打招呼开始，趁他们还没在心里递辞呈。基础士气73。看着低调，但在这家公司，低调可以救一整条社交命。",
    ru: "HR-джуниор. Начну с того, что буду здороваться с людьми прежде, чем они подадут заявление внутренне. Базовая мораль 73. Скромно, но в этой компании скромное может спасти социальные жизни.",
    it: "HR Junior. Comincerò col salutare la gente prima che si dimettano interiormente. Morale di base a 73. È discreto, ma in questa azienda il discreto può salvare vite sociali.",
    de: "HR Junior. Ich fange damit an, die Leute zu grüßen, bevor sie innerlich kündigen. Grundmoral bei 73. Es ist diskret, aber in dieser Firma kann diskret soziales Leben retten.",
  },
  karen_senior: {
    fr: "Responsable RH. Niveau de base +5, team building débloqué. Pour 300 €, tout le monde sourit pendant 60 secondes et produit +25 %. C'est presque humain, donc je valide.",
    en: "HR Manager. Base level +5, team building unlocked. For €300, everyone smiles for 60 seconds and produces +25%. It's almost human, so I'll sign off on it.",
    es: "Responsable de RRHH. Nivel base +5, team building desbloqueado. Por 300 €, todos sonríen durante 60 segundos y producen +25 %. Es casi humano, así que lo valido.",
    zh: "人事主管。基础+5，团建解锁。300欧元，让所有人笑60秒、生产+25%。几乎称得上人性化，所以我批了。",
    ru: "Руководитель HR. База +5, тимбилдинг разблокирован. За 300 € все улыбаются 60 секунд и производят +25 %. Почти по-человечески — одобряю.",
    it: "Responsabile HR. Livello base +5, team building sbloccato. Per 300 €, tutti sorridono per 60 secondi e producono +25%. Quasi umano, quindi approvo.",
    de: "HR-Leiterin. Grundlevel +5, Team-Building freigeschaltet. Für 300 € lächeln alle 60 Sekunden und produzieren +25 %. Fast menschlich, also gebe ich grünes Licht.",
  },
  karen_drh: {
    fr: "DRH. Là, on met une vraie politique sociale sur une entreprise qui fabrique des glaçons sous pression. Moral de base +8, médiation préventive, actions deux fois plus rapides. On va grandir sans transformer Fred en meuble.",
    en: "Head of HR. Now we put a real social policy on a company that manufactures ice cubes under pressure. Base morale +8, preventive mediation, actions twice as fast. We'll grow without turning Fred into a piece of furniture.",
    es: "Directora de RRHH. Ahora montamos una verdadera política social sobre una empresa que fabrica cubitos bajo presión. Moral base +8, mediación preventiva, acciones el doble de rápidas. Vamos a crecer sin convertir a Fred en un mueble.",
    zh: "人事总监。我们要在一家高压量产冰块的公司里搞一套真正的社会政策。基础士气+8，预防性调解，行动速度翻倍。我们要长大，但不能把弗雷德活成一件家具。",
    ru: "Директор по персоналу. Теперь накладываем настоящую социальную политику на компанию, которая делает кубики под давлением. Базовая мораль +8, превентивная медиация, действия в два раза быстрее. Будем расти, не превращая Фреда в предмет мебели.",
    it: "Direttrice HR. Ora mettiamo una vera politica sociale su un'azienda che fa cubetti sotto pressione. Morale di base +8, mediazione preventiva, azioni due volte più rapide. Cresceremo senza trasformare Fred in un mobile.",
    de: "HR-Direktorin. Jetzt legen wir eine echte Sozialpolitik über ein Unternehmen, das unter Druck Eiswürfel herstellt. Grundmoral +8, präventive Mediation, Aktionen doppelt so schnell. Wir wachsen, ohne Fred in ein Möbelstück zu verwandeln.",
  },
  mark_jr: {
    fr: "Acheteur Junior. Eau et énergie, je commence par les évidences. J'ai déjà trouvé deux fournisseurs qui se détestent, c'est une base saine de négociation. Prix d'achat −8 %, marge +3 %. Le froid coûte moins cher quand on insiste.",
    en: "Junior Buyer. Water and energy, I start with the obvious. I've already found two suppliers who hate each other — that's a healthy basis for negotiation. Purchase price −8%, margin +3%. Cold gets cheaper when you insist.",
    es: "Comprador Junior. Agua y energía, empiezo por lo obvio. Ya he encontrado dos proveedores que se odian, una base sana para negociar. Precio de compra −8 %, margen +3 %. El frío sale más barato cuando insistes.",
    zh: "采购初级。从最显而易见的开始：水和电。我已经找到两家互相讨厌的供应商，这是健康的谈判基础。采购价−8%，利润+3%。坚持砍价，冷就便宜。",
    ru: "Закупщик-джуниор. Вода и энергия — начинаю с очевидного. Уже нашёл двух поставщиков, которые друг друга терпеть не могут — здоровая основа для переговоров. Цена закупки −8 %, маржа +3 %. Холод дешевеет, когда настаиваешь.",
    it: "Buyer Junior. Acqua ed energia, comincio dalle ovvietà. Ho già trovato due fornitori che si odiano, è una base sana di trattativa. Prezzo d'acquisto −8%, margine +3%. Il freddo costa meno se insisti.",
    de: "Junior Einkäufer. Wasser und Energie, ich fange beim Offensichtlichen an. Ich habe schon zwei Lieferanten gefunden, die sich hassen — eine gesunde Verhandlungsbasis. Einkaufspreis −8 %, Marge +3 %. Kälte wird billiger, wenn man hartnäckig bleibt.",
  },
  mark_resp: {
    fr: "Responsable Achats. Emballages et logistique entrent dans mon périmètre. −20 % sur les matières, marge +5 %. Les fournisseurs vont appeler ça de la pression. Moi, j'appelle ça mardi.",
    en: "Procurement Lead. Packaging and logistics enter my scope. −20% on raw materials, margin +5%. Suppliers will call it pressure. I call it Tuesday.",
    es: "Responsable de Compras. Embalajes y logística entran en mi perímetro. −20 % en materias, margen +5 %. Los proveedores lo llamarán presión. Yo lo llamo martes.",
    zh: "采购主管。包装和物流也归我管。原料−20%，利润+5%。供应商管这叫施压。我管这叫周二。",
    ru: "Руководитель закупок. Упаковка и логистика теперь в моём периметре. −20 % на материалы, маржа +5 %. Поставщики назовут это давлением. Я называю это вторником.",
    it: "Responsabile Acquisti. Imballaggi e logistica entrano nel mio perimetro. −20% sulle materie, margine +5%. I fornitori la chiameranno pressione. Io la chiamo martedì.",
    de: "Einkaufsleiter. Verpackungen und Logistik kommen in meinen Bereich. −20 % auf Rohstoffe, Marge +5 %. Lieferanten werden es Druck nennen. Ich nenne es Dienstag.",
  },
  mark_dir: {
    fr: "Directeur des Achats. International, enfin. −35 % sur tout, marge +18 %. Je connais le prix de l'eau sur trois continents et le moment exact où un fournisseur commence à mentir.",
    en: "Procurement Director. International, finally. −35% on everything, margin +18%. I know the price of water on three continents and the exact moment a supplier starts lying.",
    es: "Director de Compras. Internacional, por fin. −35 % en todo, margen +18 %. Conozco el precio del agua en tres continentes y el momento exacto en que un proveedor empieza a mentir.",
    zh: "采购总监。终于做到国际了。一切−35%，利润+18%。我知道三个大洲的水价，也知道一个供应商开始撒谎的精确瞬间。",
    ru: "Директор по закупкам. Международный уровень, наконец. −35 % на всё, маржа +18 %. Я знаю цену воды на трёх континентах и точный момент, когда поставщик начинает врать.",
    it: "Direttore Acquisti. Internazionale, finalmente. −35% su tutto, margine +18%. Conosco il prezzo dell'acqua su tre continenti e il momento esatto in cui un fornitore comincia a mentire.",
    de: "Einkaufsdirektor. International, endlich. −35 % auf alles, Marge +18 %. Ich kenne den Wasserpreis auf drei Kontinenten und den genauen Moment, in dem ein Lieferant zu lügen anfängt.",
  },
  sabine_jr: {
    fr: "Juriste Junior. Je ne suis pas encore avocate, mais je sais déjà lire une plainte sans cligner des yeux. 1 procès par an, dommages réduits de 30 %. Glissade, étouffement, glaçon suspect, je classe tout par niveau d'ennui.",
    en: "Junior Counsel. I'm not a barrister yet, but I can already read a complaint without blinking. 1 lawsuit a year, damages reduced by 30%. Slip, choking, suspicious ice cube — I file everything by level of annoyance.",
    es: "Jurista Junior. Todavía no soy abogada, pero ya sé leer una demanda sin parpadear. 1 juicio al año, daños reducidos un 30 %. Resbalón, atragantamiento, cubito sospechoso — lo clasifico todo por nivel de molestia.",
    zh: "初级法务。还不是律师，但我已经能不眨眼地读完一份起诉书。每年1起诉讼，损失降30%。滑倒、噎到、可疑冰块，我按「烦人程度」归类。",
    ru: "Юрист-джуниор. Адвокат я пока нет, но уже умею читать иск, не моргая. 1 иск в год, ущерб уменьшен на 30 %. Поскользнулся, поперхнулся, подозрительный кубик — всё классифицирую по уровню раздражения.",
    it: "Giurista Junior. Non sono ancora avvocato, ma so già leggere una denuncia senza battere ciglio. 1 causa l'anno, danni ridotti del 30%. Scivolata, soffocamento, cubetto sospetto — archivio tutto per livello di noia.",
    de: "Junior-Juristin. Anwältin bin ich noch nicht, aber ich kann schon eine Klage lesen, ohne zu blinzeln. 1 Klage pro Jahr, Schäden um 30 % reduziert. Sturz, Verschlucken, verdächtiger Eiswürfel — ich ordne alles nach Lästigkeitsgrad ein.",
  },
  sabine_sr: {
    fr: "Avocate, désormais. Trois procès par an, dommages divisés par 2,5. Je préfère prévenir avant le tribunal, parce que le tribunal coûte cher et sent la moquette fatiguée.",
    en: "Barrister now. Three lawsuits a year, damages divided by 2.5. I'd rather prevent before court, because court is expensive and smells of tired carpet.",
    es: "Ya soy abogada. Tres juicios al año, daños divididos por 2,5. Prefiero prevenir antes del tribunal, porque el tribunal cuesta caro y huele a moqueta cansada.",
    zh: "现在是律师了。每年3起诉讼，损失÷2.5。我更喜欢在上法庭之前就处理掉，因为法庭又贵，又一股累瘫的地毯味。",
    ru: "Теперь адвокат. Три иска в год, ущерб делится на 2,5. Предпочитаю предотвращать до суда, потому что суд дорог и пахнет уставшим ковролином.",
    it: "Avvocato, ora. Tre cause l'anno, danni divisi per 2,5. Preferisco prevenire prima del tribunale, perché il tribunale costa caro e sa di moquette stanca.",
    de: "Jetzt Anwältin. Drei Klagen pro Jahr, Schäden durch 2,5 geteilt. Ich beuge lieber vor dem Gericht vor, denn das Gericht ist teuer und riecht nach müdem Teppich.",
  },
  sabine_dg: {
    fr: "Directrice Générale du Juridique. Tous les procès gérés, dommages réduits de 90 %. À ce niveau, le risque existe encore, mais il porte une cravate et demande mon autorisation avant d'entrer.",
    en: "Chief Legal Officer. All lawsuits handled, damages reduced by 90%. At this level, risk still exists, but it wears a tie and asks my permission before entering.",
    es: "Directora General Jurídica. Todos los juicios gestionados, daños reducidos un 90 %. A este nivel el riesgo sigue existiendo, pero lleva corbata y pide mi permiso antes de entrar.",
    zh: "法务总监。所有诉讼接管，损失减少90%。到这层级，风险依然存在——只是它戴着领带，进门之前会先问我能不能进。",
    ru: "Главный юридический директор. Все иски ведутся, ущерб уменьшен на 90 %. На этом уровне риск ещё существует — но он в галстуке и спрашивает моего разрешения войти.",
    it: "Direttrice Generale Legale. Tutte le cause gestite, danni ridotti del 90%. A questo livello il rischio esiste ancora, ma porta una cravatta e chiede il mio permesso prima di entrare.",
    de: "Chief Legal Officer. Alle Klagen behandelt, Schäden um 90 % reduziert. Auf diesem Level existiert das Risiko noch — aber es trägt Krawatte und bittet um meine Erlaubnis, bevor es eintritt.",
  },
};

function fmtEntry(id) {
  const sp = speaker(id);
  const e = THANKS[id];
  // Format identique à l'existant : 1 langue par ligne.
  return `  ${id}: { speaker: '${sp}',
    fr: "${e.fr}",
    en: "${e.en}",
    es: "${e.es}",
    zh: "${e.zh}",
    ru: "${e.ru}",
    it: "${e.it}",
    de: "${e.de}" },\n`;
}

let src = fs.readFileSync(SRC_PATH, 'utf8');

const startMarker = 'const UPGRADE_THANKS = {';
const startIdx = src.indexOf(startMarker);
if (startIdx < 0) throw new Error('UPGRADE_THANKS introuvable');

// Trouve la fin du bloc via comptage de braces
let i = startIdx + startMarker.length;
let depth = 1;
while (i < src.length && depth > 0) {
  const c = src[i];
  if (c === '{') depth++;
  else if (c === '}') depth--;
  i++;
}
const endIdx = i; // après le `}` final
const block = src.slice(startIdx, endIdx);

let modCount = 0, addCount = 0, kept = 0;
const ids = Object.keys(THANKS);

// 1) Remplace les entrées existantes (regex pour chaque id)
let newBlock = block;
for (const id of ids) {
  // Pattern : `  <id>: { speaker: 'X',\n    fr: "..",\n ... de: ".." },` puis \n optionnel
  const re = new RegExp(
    `  ${id}: \\{ speaker: '[^']+',\\n(?:    [a-z]{2}: "[^"]*",\\n){6}    [a-z]{2}: "[^"]*" \\},?\\n`,
    'm'
  );
  if (re.test(newBlock)) {
    newBlock = newBlock.replace(re, fmtEntry(id));
    modCount++;
  } else {
    // À insérer avant le `};` final
    const insertAt = newBlock.lastIndexOf('};');
    newBlock = newBlock.slice(0, insertAt) + fmtEntry(id) + newBlock.slice(insertAt);
    addCount++;
  }
}

// Comptage des entrées non touchées (autres ids)
const remainingIds = (newBlock.match(/\n  \w+: \{ speaker:/g) || []).length;
kept = remainingIds - ids.length;

src = src.slice(0, startIdx) + newBlock + src.slice(endIdx);
fs.writeFileSync(SRC_PATH, src);
console.log(`Updated: ${modCount}  Added: ${addCount}  Other entries kept: ${kept}`);
