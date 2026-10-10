import { GameState, Notification, TileType } from '../types';
import { TICKS_PER_DAY, DAYS_PER_MONTH } from '../constants';

export type NewsCategory = 'SCANDAL' | 'FACTION' | 'CITY_EVENT' | 'ECONOMY' | 'INFRASTRUCTURE';
export type NewsSeverity = 'CRITICAL' | 'WARNING' | 'NORMAL' | 'POSITIVE';

export interface NewsTickerItem {
  id: string;
  category: NewsCategory;
  headline: string;
  summary: string;
  fullStory: string;
  source: string;
  timestamp: string;
  severity: NewsSeverity;
  impactTag: string;
  factionId?: 'union' | 'elite' | 'gray';
  statDelta?: {
    label: string;
    value: string;
    type: 'negative' | 'positive' | 'neutral';
  };
}

export const formatSimDate = (ticks: number): string => {
  const totalDays = Math.floor(ticks / TICKS_PER_DAY);
  const month = Math.floor(totalDays / DAYS_PER_MONTH) + 1;
  const day = (totalDays % DAYS_PER_MONTH) + 1;
  return `Month ${month}, Day ${day}`;
};

/**
 * Generates an initial pool of contextual news items based on the starting game state
 */
export const getInitialNewsItems = (state: GameState): NewsTickerItem[] => {
  const dateStr = formatSimDate(state.date);
  return [
    {
      id: 'init-1',
      category: 'CITY_EVENT',
      headline: 'MAYOR INAUGURATES CIVIC MASTER PLAN AT CITY HALL',
      summary: 'Executive decree establishes ambitious urban development and zoning charter.',
      fullStory: 'Before a cheering assembly on the steps of the Neoclassical City Hall, the Mayor officially opened the urban management terminal. Zoning commissioners have begun allocating municipal parcels for residential growth, industrial workshops, and public safety infrastructure.',
      source: 'Metropolis Tribune',
      timestamp: dateStr,
      severity: 'POSITIVE',
      impactTag: '🏛️ Civic Inauguration',
      statDelta: { label: 'Public Approval', value: '+15%', type: 'positive' }
    },
    {
      id: 'init-2',
      category: 'FACTION',
      headline: 'IRON UNION PLEDGES SUPPORT PENDING SAFETY STANDARDS',
      summary: 'Labor leaders demand strict building inspections and fair union hall representation.',
      fullStory: 'Speaking from the industrial district, Union organizer Marcus Vance stated: "We stand ready to build this metropolis, but our members will not sacrifice life and limb on cut-corner scaffolding. City Hall must maintain strict safety regulations."',
      source: 'The Worker\'s Voice',
      timestamp: dateStr,
      severity: 'NORMAL',
      impactTag: '🛠️ Labor Movement',
      factionId: 'union',
      statDelta: { label: 'Union Goodwill', value: 'Guarded', type: 'neutral' }
    },
    {
      id: 'init-3',
      category: 'ECONOMY',
      headline: 'GILDED CIRCLE MONITORS MUNICIPAL TAX BRACKETS',
      summary: 'Commercial tycoons urge low taxation and rapid zoning of lucrative commercial corridors.',
      fullStory: 'At the downtown Commerce Exchange, banking magnates expressed cautious optimism regarding initial treasury reserves. "Capital flows where it is respected," noted Gilded Circle representative Sterling Vance. "Lower tax rates will ensure high-rise skyscrapers rise across the skyline."',
      source: 'Wall Street Sentinel',
      timestamp: dateStr,
      severity: 'NORMAL',
      impactTag: '💼 Capital Markets',
      factionId: 'elite',
      statDelta: { label: 'Commercial Interest', value: 'Active', type: 'positive' }
    },
    {
      id: 'init-4',
      category: 'INFRASTRUCTURE',
      headline: 'POWER GRID & SERVICE COVERAGE ACTIVATED CITYWIDE',
      summary: 'Central Power Plant turbines spin up to provide electrified utilities to zoned districts.',
      fullStory: 'Municipal engineers confirmed the central reactor facility is generating megawatts across the arterial road grid. Neighborhoods connected by paved roadways and proximity to municipal precincts will enjoy rapid building upgrades and lower fire decay.',
      source: 'Metropolis Public Works',
      timestamp: dateStr,
      severity: 'POSITIVE',
      impactTag: '⚡ Grid Online',
      statDelta: { label: 'Power Grid', value: '100% Stable', type: 'positive' }
    }
  ];
};

/**
 * Dynamically evaluates current GameState to synthesize breaking news dispatches,
 * scandalous exposes, or faction movements that react directly to player choices.
 */
export const evaluateGameStateNews = (
  currentState: GameState,
  previousState: GameState | null
): NewsTickerItem | null => {
  const dateStr = formatSimDate(currentState.date);
  const rand = Math.random();

  // 1. SCANDAL CHECKS (Triggered by high corruption, low safety, extreme taxes, or shady policies)
  if (currentState.corruption > 60 && rand < 0.35) {
    return {
      id: `scandal-corrupt-high-${currentState.date}`,
      category: 'SCANDAL',
      headline: 'EXPLOSIVE LEAK: AUDIT REVEALS $500,000 IN FRAUDULENT ZONING KICKBACKS!',
      summary: 'Special prosecutor opens criminal probe into backroom deals at City Hall.',
      fullStory: 'A leaked ledger obtained by investigative journalists shows hundreds of thousands of municipal dollars funneled through dummy corporations for unbuilt road contracts. Whistleblowers allege senior officials accepted cash envelopes to fast-track commercial permits without environmental reviews.',
      source: 'The City Whistleblower',
      timestamp: dateStr,
      severity: 'CRITICAL',
      impactTag: '⚖️ Grand Jury Probe',
      statDelta: { label: 'Corruption Spike', value: `${Math.round(currentState.corruption)}%`, type: 'negative' }
    };
  }

  if (currentState.corruption > 40 && currentState.safety < 45 && rand < 0.3) {
    return {
      id: `scandal-coverup-${currentState.date}`,
      category: 'SCANDAL',
      headline: 'COVER-UP EXPOSED: POLICE PRECINCT REPORTEDLY ORDERED TO BURY CRIME LOGS',
      summary: 'Internal precinct memos instruct desk sergeants to classify burglaries as "clerical errors."',
      fullStory: 'A sworn affidavit from veteran beat patrolmen reveals systematic tampering with municipal safety statistics. Officers were pressured to suppress crime data ahead of budget votes, leaving outer residential wards defenseless against organized racket crews.',
      source: 'Metropolis Daily Gazette',
      timestamp: dateStr,
      severity: 'CRITICAL',
      impactTag: '🚨 Badge Corruption',
      statDelta: { label: 'Civic Trust', value: '-22%', type: 'negative' }
    };
  }

  if (currentState.taxRate >= 0.22 && rand < 0.3) {
    return {
      id: `scandal-tax-revolt-${currentState.date}`,
      category: 'SCANDAL',
      headline: 'TAXPAYER REVOLT: CITIZENS RALLY OUTSIDE MAYOR\'S WINDOW OVER OPPRESSIVE LEVIES',
      summary: 'Thousands chant "No Taxation Without Sanitation" as municipal tax rate reaches punitive heights.',
      fullStory: 'A spontaneous protest erupted on the front steps of City Hall as small shopkeepers and working-class families burned their quarterly tax assessments. Federation leaders threatened an organized tax strike unless city council rolls back the rates immediately.',
      source: 'Metropolis Free Press',
      timestamp: dateStr,
      severity: 'WARNING',
      impactTag: '🔥 Tax Revolt',
      statDelta: { label: 'Tax Burden', value: `${Math.round(currentState.taxRate * 100)}%`, type: 'negative' }
    };
  }

  // 2. FACTION MOVEMENTS
  // A. Iron Union
  if (currentState.factions.union.happiness < 35 && rand < 0.3) {
    return {
      id: `faction-union-strike-${currentState.date}`,
      category: 'FACTION',
      headline: 'IRON UNION CALLS WILDCAT STRIKE! FACTORY SMOKESTACKS GO COLD',
      summary: 'Over 2,000 industrial machinists walk off the job demanding hazard pay and safety regulations.',
      fullStory: 'Shouting through bullhorns outside the Union Hall, labor leaders declared a total stoppage across all municipal manufacturing sites. "If City Hall treats human workers like cheap spare parts, the machines will sit idle," warned Union delegates.',
      source: 'The Labor Herald',
      timestamp: dateStr,
      severity: 'CRITICAL',
      impactTag: '✊ General Strike',
      factionId: 'union',
      statDelta: { label: 'Industrial Output', value: '-45%', type: 'negative' }
    };
  } else if (currentState.factions.union.happiness > 70 && rand < 0.25) {
    return {
      id: `faction-union-praise-${currentState.date}`,
      category: 'FACTION',
      headline: 'IRON UNION ENDORSES MAYOR\'S PRO-WORKER INFRASTRUCTURE INITIATIVES',
      summary: 'Labor council commends city leadership for maintaining robust workplace standards.',
      fullStory: 'At the annual Labor Federation banquet, Union bosses awarded City Hall the Golden Rivet award, citing exemplary workplace safety and fair funding for civic infrastructure. Working-class families report rising optimism across all industrial wards.',
      source: 'The Labor Herald',
      timestamp: dateStr,
      severity: 'POSITIVE',
      impactTag: '🛠️ Union Solidarity',
      factionId: 'union',
      statDelta: { label: 'Worker Morale', value: 'All-Time High', type: 'positive' }
    };
  }

  // B. Gilded Circle
  if (currentState.factions.elite.happiness < 35 && rand < 0.3) {
    return {
      id: `faction-elite-flight-${currentState.date}`,
      category: 'FACTION',
      headline: 'GILDED CIRCLE THREATENS CAPITAL FLIGHT: "INVESTMENT WILL LEAVE METROPOLIS"',
      summary: 'Banking syndicate threatens to freeze credit lines unless corporate tax cuts are enacted.',
      fullStory: 'A joint communiqué issued by commercial property developers warned that current municipal tax and regulation policies are suffocating entrepreneurship. Several major holding firms announced plans to explore rival jurisdictions unless the Mayor negotiates.',
      source: 'Wall Street Sentinel',
      timestamp: dateStr,
      severity: 'WARNING',
      impactTag: '📉 Capital Freeze',
      factionId: 'elite',
      statDelta: { label: 'Commercial Demand', value: '-20%', type: 'negative' }
    };
  } else if (currentState.factions.elite.happiness > 70 && rand < 0.25) {
    return {
      id: `faction-elite-boom-${currentState.date}`,
      category: 'FACTION',
      headline: 'GILDED CIRCLE POURS VENTURE CAPITAL INTO DOWNTOWN SKYSCRAPERS',
      summary: 'Billionaire consortium approves massive luxury tower and commercial development fund.',
      fullStory: 'Spurred by favorable business conditions, Wall Street conglomerates unveiled a massive financing package for high-rise commercial architecture. "Metropolis is entering its golden age of enterprise," beamed chief investment strategist Victoria Sterling.',
      source: 'Wall Street Sentinel',
      timestamp: dateStr,
      severity: 'POSITIVE',
      impactTag: '📈 Enterprise Boom',
      factionId: 'elite',
      statDelta: { label: 'Commerce Growth', value: '+30%', type: 'positive' }
    };
  }

  // C. Gray Syndicate / Common Citizens
  if (currentState.safety < 40 && rand < 0.3) {
    return {
      id: `faction-gray-unrest-${currentState.date}`,
      category: 'FACTION',
      headline: 'CRIME WAVE ENGULFS OUTER WARDS: GRAY SYNDICATE FILLING POLICE VACUUM',
      summary: 'Vigilante street bosses and black market cartels take control of neglected streets.',
      fullStory: 'With police presence thin and streetlamps darkened by utility neglect, underground syndicates have set up unlicensed toll booths and protection rings. Desperate merchants plead with City Hall for immediate precinct reinforcements.',
      source: 'Metropolis Evening Dispatch',
      timestamp: dateStr,
      severity: 'CRITICAL',
      impactTag: '🦹 Underworld Surge',
      factionId: 'gray',
      statDelta: { label: 'City Safety', value: `${Math.round(currentState.safety)}/100`, type: 'negative' }
    };
  }

  // 3. CITY EVENTS & INFRASTRUCTURE
  // Check power shortages
  let unpoweredCount = 0;
  for (let i = 0; i < currentState.grid.length; i++) {
    const tile = currentState.grid[i];
    if (tile.type !== TileType.EMPTY && tile.type !== TileType.ROAD && tile.level > 0 && !tile.hasPower) {
      unpoweredCount++;
    }
  }

  if (unpoweredCount > 5 && rand < 0.35) {
    return {
      id: `event-blackout-${currentState.date}`,
      category: 'INFRASTRUCTURE',
      headline: 'ROLLING BLACKOUTS PLUNGE OVER 5 WARDS INTO DARKNESS!',
      summary: 'Power grid overload trips substations; factories and homes demand grid expansion.',
      fullStory: 'Turbines groaned under peak load this afternoon, dropping voltage across developed residential blocks and industrial shops. Utility operators urge City Hall to construct additional Power Plants or expand road networks to carry high-voltage lines.',
      source: 'Metropolis Grid Authority',
      timestamp: dateStr,
      severity: 'WARNING',
      impactTag: '⚡ Power Outage',
      statDelta: { label: 'Unpowered Zones', value: `${unpoweredCount} Lots`, type: 'negative' }
    };
  }

  // Housing demand check
  if (currentState.housingDemand > 70 && rand < 0.3) {
    return {
      id: `event-housing-shortage-${currentState.date}`,
      category: 'CITY_EVENT',
      headline: 'HOUSING SHORTAGE CRISIS: THOUSANDS IN QUEUE FOR ZONED RESIDENTIAL PLOTS',
      summary: 'Rents skyrocket as population boom outpaces current residential zoning capacity.',
      fullStory: 'Immigrant families and aspiring workers have set up temporary tents near municipal transit corridors. Urban planning experts advise the Mayor to zone new residential acreage immediately or permit 3x3 block consolidation into mega-apartment citadels.',
      source: 'Metropolis Housing Authority',
      timestamp: dateStr,
      severity: 'WARNING',
      impactTag: '🏘️ Housing Shortage',
      statDelta: { label: 'Housing Demand', value: `${currentState.housingDemand}%`, type: 'neutral' }
    };
  }

  // 4. ENVIRONMENTAL & PUBLIC HEALTH CHECKS
  if ((currentState.averagePollution || 0) > 48 && rand < 0.35) {
    return {
      id: `event-smog-crisis-${currentState.date}`,
      category: 'CITY_EVENT',
      headline: 'HEALTH EMERGENCY: TOXIC INDUSTRIAL SMOG SICKENS HUNDREDS OF RESIDENTS!',
      summary: 'Hospitals overflow with respiratory cases as unscrubbed soot from factories blankets the city.',
      fullStory: 'Medical chiefs have declared a yellow alert across metropolitan hospitals. Pediatric and pulmonary wards report record patient intake from neighborhoods bordering industrial zones and the central power plant. Civic advocates demand the Mayor immediately construct Botanical Parks and Civic Statues to absorb the airborne toxins.',
      source: 'Metropolis Health Department',
      timestamp: dateStr,
      severity: 'CRITICAL',
      impactTag: '😷 Toxic Smog Alert',
      statDelta: { label: 'Air Quality (AQI)', value: `${currentState.averagePollution || 50} (Hazardous)`, type: 'negative' }
    };
  }

  // Parks and Clean Air check
  const parkCount = currentState.grid.filter(t => t.type === TileType.PARK).length;
  const statueCount = currentState.grid.filter(t => t.type === TileType.STATUE).length;
  if ((parkCount > 0 || statueCount > 0) && (currentState.averagePollution || 0) < 28 && rand < 0.25) {
    return {
      id: `event-clean-air-triumph-${currentState.date}`,
      category: 'CITY_EVENT',
      headline: 'BOTANICAL TRIUMPH: CITY PARKS & MONUMENTS RESTORE CRISP SKIES AND HIGH CITIZEN MORALE!',
      summary: 'Air quality monitors register dramatic drops in airborne toxins as verdant green spaces flourish.',
      fullStory: 'Citizens flocked to municipal parkways and public squares this morning under immaculate blue skies. Environmental scientists confirmed that newly planted botanical parks and heroic civic monuments have scrubbed industrial emissions, lifting citywide satisfaction and eliminating pollution-induced respiratory illness.',
      source: 'Metropolis Environmental Agency',
      timestamp: dateStr,
      severity: 'POSITIVE',
      impactTag: '🌲 Clean Air Milestone',
      statDelta: { label: 'Citizen Morale', value: `${currentState.cityMorale || 85}%`, type: 'positive' }
    };
  }

  // Population milestones
  if (currentState.population >= 1000 && (!previousState || previousState.population < 1000)) {
    return {
      id: `milestone-pop-1000-${currentState.date}`,
      category: 'CITY_EVENT',
      headline: 'HISTORIC CENSUS: METROPOLIS POPULATION SURPASSES 1,000 PERMANENT CITIZENS!',
      summary: 'Municipal registry rings bells as city is officially promoted to Chartered Urban Center.',
      fullStory: 'Town clerks confirmed the registry of the 1,000th resident today. The Governor sent official congratulations, noting that Metropolis has grown from a grassy prairie into one of the fastest developing economic hubs on the eastern seaboard.',
      source: 'City Hall Press Office',
      timestamp: dateStr,
      severity: 'POSITIVE',
      impactTag: '🎉 Population 1,000+',
      statDelta: { label: 'Census Population', value: `${currentState.population.toLocaleString()}`, type: 'positive' }
    };
  }

  if (currentState.population >= 2500 && (!previousState || previousState.population < 2500)) {
    return {
      id: `milestone-pop-2500-${currentState.date}`,
      category: 'CITY_EVENT',
      headline: 'METROPOLIS CROSSED 2,500 CITIZENS: DOWNTOWN SKYLINE BEGINS CONSOLIDATION',
      summary: 'High-density development accelerates as thriving metropolis attracts regional talent.',
      fullStory: 'Commercial districts are buzzing with foot traffic as over 2,500 citizens make Metropolis their permanent home. Civic planners recommend investing heavily in collegiate education and fire protection to sustain the momentum.',
      source: 'City Hall Press Office',
      timestamp: dateStr,
      severity: 'POSITIVE',
      impactTag: '🏆 Population 2,500+',
      statDelta: { label: 'Census Count', value: `${currentState.population.toLocaleString()}`, type: 'positive' }
    };
  }

  // Budget status
  if (currentState.money > 200000 && rand < 0.2) {
    return {
      id: `economy-surplus-${currentState.date}`,
      category: 'ECONOMY',
      headline: 'TREASURY POSTS RECORD SURPLUS: MUNICIPAL COFFERS SWELL PAST $200,000',
      summary: 'Fiscal discipline and bustling trade yield unprecedented public funding reserves.',
      fullStory: 'City Treasurer reports outstanding tax collection efficiency and budget stability. Civic leaders are debating whether to funnel surplus funds into educational campuses, police substations, or citizen subsidies.',
      source: 'Metropolis Financial Review',
      timestamp: dateStr,
      severity: 'POSITIVE',
      impactTag: '💰 Treasury Boom',
      statDelta: { label: 'Coffers', value: `$${currentState.money.toLocaleString()}`, type: 'positive' }
    };
  } else if (currentState.money < 5000 && rand < 0.3) {
    return {
      id: `economy-deficit-${currentState.date}`,
      category: 'ECONOMY',
      headline: 'INSOLVENCY WARNING: CITY COFFERS EVAPORATING RAPIDLY UNDER HEAVY OVERHEAD',
      summary: 'Budget office warns of emergency service cuts unless revenue is increased.',
      fullStory: 'Maintenance overhead on unzoned structures and heavy municipal subsidies have drawn treasury reserves to critical lows. Finance officials urge the Mayor to enact temporary tax increases or demolish unprofitable utility sprawl.',
      source: 'Metropolis Financial Review',
      timestamp: dateStr,
      severity: 'CRITICAL',
      impactTag: '📉 Treasury Warning',
      statDelta: { label: 'Treasury Balance', value: `$${currentState.money.toLocaleString()}`, type: 'negative' }
    };
  }

  return null;
};

/**
 * Purely procedural, simulation-driven news generator for The Wire & Daily Newspaper.
 * Evaluates live city simulation indicators to craft investigative reporting,
 * faction moves, propaganda pieces, and public interest dispatches with zero external API calls.
 */
export const generateSimulationNewsReport = (state: GameState): Notification => {
  const dayNum = Math.floor(state.date / TICKS_PER_DAY) + 1;
  const rand = Math.random();

  // 1. High Corruption (> 50): Distracting propaganda or scandalous leaks
  if (state.corruption > 55) {
    const corruptReports = [
      {
        title: "CITY HALL RELEASES GLOWING AUDIT AHEAD OF BUDGET DEBATE",
        message: "An expedited municipal review praised fiscal efficiency across executive departments. Watchdog groups questioned the audit's methodology, noting several consulting contracts were awarded without public bidding.",
        source: "The Daily Gazette",
        bias: 85,
      },
      {
        title: "LEAKED MEMOS SUGGEST ZONING FAST-TRACKS FOR CAMPAIGN DONORS",
        message: "An anonymous whistleblower submitted internal planning department correspondence revealing expedited commercial permits for high-value contributors. Officials dismissed the claims as partisan rumor.",
        source: "The City Whistleblower",
        bias: 20,
      },
      {
        title: "EXTRAVAGANT CIVIC BANQUET CELEBRATES PROSPEROUS METROPOLIS",
        message: "Gilded Circle magnates gathered at City Hall for an opulent charity gala. Attendees lauded leadership while outer district residents held candlelight rallies demanding sewer and road repairs.",
        source: "Society & Commerce Herald",
        bias: 90,
      },
      {
        title: "INSPECTION PROTOCOLS 'STREAMLINED' TO SPUR RAPID GROWTH",
        message: "Municipal building regulators announced simplified code reviews for commercial towers. Industrial labor unions immediately warned of scaffolding and boiler hazards.",
        source: "The Metropolitan Examiner",
        bias: 75,
      },
    ];
    const item = corruptReports[Math.floor(rand * corruptReports.length)];
    return {
      id: `sim-news-corrupt-${Date.now()}-${Math.floor(rand * 1000)}`,
      title: item.title,
      message: item.message,
      date: state.date,
      source: 'News',
      bias: item.bias,
    };
  }

  // 2. Low Public Safety (< 42): Crime waves, night vigils, police shortages
  if (state.safety < 42) {
    const safetyReports = [
      {
        title: "MERCHANTS DEMAND INCREASED POLICE FOOT PATROLS IN DOWNTOWN CORRIDORS",
        message: "Shopkeepers along the commercial avenue reported a surge in after-hours burglaries. The Police Chief appealed to City Hall for precinct expansions and squad car funding.",
        source: "Metropolis Evening Dispatch",
        bias: 15,
      },
      {
        title: "COMMUNITY WATCH ORGANIZES CITIZEN PATROLS AMID PRECINCT STRAIN",
        message: "Neighborhood associations have begun escorting evening commuters following multiple street muggings. Beat officers report slow response times due to wide coverage zones.",
        source: "The Citizen Voice",
        bias: 10,
      },
      {
        title: "UNDERWORLD SYNDICATES FILL VOID IN UNPATROLLED OUTER WARDS",
        message: "Unlicensed protection rings have reportedly begun collecting dues from warehouse operators. Law enforcement leaders urged victims to file formal complaints despite retaliation fears.",
        source: "Metropolis Daily Journal",
        bias: 25,
      },
    ];
    const item = safetyReports[Math.floor(rand * safetyReports.length)];
    return {
      id: `sim-news-safety-${Date.now()}-${Math.floor(rand * 1000)}`,
      title: item.title,
      message: item.message,
      date: state.date,
      source: 'News',
      bias: item.bias,
    };
  }

  // 3. Environmental Smog Alert (Pollution > 45)
  if ((state.averagePollution || 0) > 45) {
    const pollutionReports = [
      {
        title: "HEALTH DEPARTMENT ISSUES ADVISORY OVER INDUSTRIAL SMOG CANOPY",
        message: "Dense airborne particulate levels prompted medical officers to recommend sensitive residents remain indoors. Pediatric wards report elevated admissions near the manufacturing corridor.",
        source: "Metropolis Health Reporter",
        bias: 10,
      },
      {
        title: "AIR QUALITY MONITORS REGISTER HAZARDOUS PARTICULATE LEVEL",
        message: "Unscrubbed smokestack emissions combined with power plant output have clouded downtown skylines. Civic advocates urge immediate botanical park zoning to absorb airborne toxins.",
        source: "Environmental Action Bulletin",
        bias: 15,
      },
    ];
    const item = pollutionReports[Math.floor(rand * pollutionReports.length)];
    return {
      id: `sim-news-smog-${Date.now()}-${Math.floor(rand * 1000)}`,
      title: item.title,
      message: item.message,
      date: state.date,
      source: 'News',
      bias: item.bias,
    };
  }

  // 4. Clean Air & Botanical Triumph (Parks exist and pollution is low)
  const parkCount = state.grid.filter(t => t.type === TileType.PARK).length;
  if (parkCount > 0 && (state.averagePollution || 0) < 25 && rand < 0.3) {
    return {
      id: `sim-news-parks-${Date.now()}-${Math.floor(rand * 1000)}`,
      title: "BOTANICAL PARKS & MONUMENTS RESTORE PRISTINE SKIES ACROSS WARDS",
      message: "Verdant municipal gardens and civic fountains have absorbed urban emissions, bringing crisp air and soaring citizen morale. Families packed public walkways this morning under immaculate blue skies.",
      date: state.date,
      source: 'News',
      bias: 5,
    };
  }

  // 5. Housing Shortage & High Demand (> 65)
  if (state.housingDemand > 65 && rand < 0.4) {
    return {
      id: `sim-news-housing-${Date.now()}-${Math.floor(rand * 1000)}`,
      title: "HOUSING QUEUES EXTEND AS POPULATION BOOM STRAINS ZONED PARCELS",
      message: "Tenants and arriving workers face soaring rental rates across the city. Urban planning experts recommend immediate residential zoning expansions and 3x3 superblock consolidation.",
      date: state.date,
      source: 'News',
      bias: 10,
    };
  }

  // 6. Treasury Alert (Deficit or Surplus)
  if (state.money < 10000 && rand < 0.45) {
    return {
      id: `sim-news-treasury-low-${Date.now()}-${Math.floor(rand * 1000)}`,
      title: "MUNICIPAL BUDGET TIGHTENS: CITY TREASURER SOUNDS CAPITAL RESERVE ALARM",
      message: "Heavy infrastructure maintenance and uncollected revenues have lowered city reserves to cautionary levels. Financial analysts warn service furloughs may loom without corrective tax adjustments.",
      date: state.date,
      source: 'News',
      bias: 15,
    };
  } else if (state.money > 150000 && rand < 0.3) {
    return {
      id: `sim-news-treasury-high-${Date.now()}-${Math.floor(rand * 1000)}`,
      title: "TREASURY POSTS ROBUST SURPLUS FROM EXPANDED COMMERCE REVENUES",
      message: "Quarterly municipal returns show surging sales and property tax yields. City council representatives proposed allocating reserve windfalls toward educational and public safety infrastructure.",
      date: state.date,
      source: 'News',
      bias: 10,
    };
  }

  // 7. Faction Highlights (Labor or Elite)
  if (state.factions.union.happiness < 40 && rand < 0.4) {
    return {
      id: `sim-news-union-${Date.now()}-${Math.floor(rand * 1000)}`,
      title: "IRON UNION HALL PASSES RESOLUTION DEMANDING WORKPLACE SAFETY INSPECTIONS",
      message: "Machinists and tradespeople packed Local 101 to voice grievances regarding scaffolding standards and unpowered worksites. Delegates warned municipal leaders that labor goodwill has grown fragile.",
      date: state.date,
      source: 'News',
      bias: 20,
    };
  } else if (state.factions.elite.happiness < 40 && rand < 0.4) {
    return {
      id: `sim-news-elite-${Date.now()}-${Math.floor(rand * 1000)}`,
      title: "COMMERCIAL CONSORTIUM EXPRESSES SKEPTICISM OVER CURRENT REGULATORY POLICY",
      message: "At the downtown Banking Club, real estate developers debated whether to pause commercial high-rise construction pending municipal deregulation and tax incentive reassurances.",
      date: state.date,
      source: 'News',
      bias: 40,
    };
  }

  // 8. General City Progression & Daily Dispatches
  const generalDispatches = [
    {
      title: `DAY ${dayNum} CIVIC RECORD: METROPOLIS CONTINUES URBAN DEVELOPMENT CHARTER`,
      message: `With ${state.population.toLocaleString()} permanent citizens residing in the municipality, commercial and residential districts report steady foot traffic. Engineering teams continue expanding the municipal arterial road network.`,
      source: "Metropolis Tribune",
      bias: 5,
    },
    {
      title: "COMMUTERS REPORT SMOOTH TRANSIT ALONG PRIMARY ARTERIAL BOULEVARDS",
      message: "Department of Transportation engineers confirmed paved avenues are maintaining free-flowing traffic. Delivery vans and worker vehicles reported rapid transit between industrial and retail sectors.",
      source: "City Press Wire",
      bias: 5,
    },
    {
      title: "LOCAL CORNER MARKETS EXPAND SHELF SPACE TO MEET GROWING RESIDENTIAL DEMAND",
      message: "Shopkeepers in mid-density neighborhoods report brisk morning sales. Small business owners credit balanced zoning and proximity to paved transit corridors for rising customer volume.",
      source: "The Worker's Voice",
      bias: 10,
    },
    {
      title: "PLANNING COMMISSION SURVEYS METROPOLIS SKYLINE FOR HIGH-DENSITY EXPANSION",
      message: "Architectural blueprints for 3x3 superblock residential citadels and high-rise commercial corridors were submitted to the zoning bureau this week as private investment gathers momentum.",
      source: "Wall Street Sentinel",
      bias: 15,
    },
  ];

  const chosen = generalDispatches[Math.floor(rand * generalDispatches.length)];
  return {
    id: `sim-news-gen-${Date.now()}-${Math.floor(rand * 1000)}`,
    title: chosen.title,
    message: chosen.message,
    date: state.date,
    source: 'News',
    bias: chosen.bias,
  };
};

