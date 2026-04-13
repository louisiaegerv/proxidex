export interface HeroCard { id: string; name: string; imageUrl: string; }
export const HERO_CARDS: HeroCard[] = [
  { id: "base1-4", name: "Charizard", imageUrl: "/api/images/Base_Set_BS/Charizard_BS_4_md.webp" },
  { id: "base1-15", name: "Venusaur", imageUrl: "/api/images/Base_Set_BS/Venusaur_BS_15_md.webp" },
  { id: "base1-20", name: "Blastoise", imageUrl: "/api/images/Base_Set_BS/Blastoise_BS_2_md.webp" },
  { id: "base1-58", name: "Pikachu", imageUrl: "/api/images/Base_Set_BS/Pikachu_BS_58_md.webp" },
  { id: "base2-10", name: "Mewtwo", imageUrl: "/api/images/Base_Set_BS/Mewtwo_BS_10_md.webp" },
  { id: "base3-2", name: "Articuno", imageUrl: "/api/images/Fossil_FO/Articuno_FO_2_md.webp" },
  { id: "base5-4", name: "Dark Charizard", imageUrl: "/api/images/Team_Rocket_RO/Dark_Charizard_RO_21_lg.webp" },
  { id: "neo1-9", name: "Lugia", imageUrl: "/api/images/Neo_Genesis_N1/Lugia_N1_9_md.webp" },
  { id: "neo2-1", name: "Espeon", imageUrl: "/api/images/Neo_Discovery_N2/Espeon_N2_1_md.webp" },
  { id: "ex3-97", name: "Rayquaza ex", imageUrl: "/api/images/Dragon_DR/Rayquaza_ex_DR_97_md.webp" },
  { id: "dp1-1", name: "Dialga", imageUrl: "/api/images/Diamond_Pearl_DP/Dialga_DP_1_md.webp" },
  { id: "dp2-26", name: "Palkia", imageUrl: "/api/images/BREAKpoint_BKP/Palkia-EX_BKP_31_md.webp" },
  { id: "bw1-47", name: "Zekrom", imageUrl: "/api/images/Sun_Moon_Promos_SMP/Pikachu__Zekrom-GX_SMP_SM168_md.webp" },
  { id: "twm-130", name: "Dragapult EX", imageUrl: "/api/images/Twilight_Masquerade_TWM/Dragapult_ex_TWM_130_md.webp"},
  { id: "pre-037", name: "Dusknoir", imageUrl: "/api/images/Prismatic_Evolutions_PRE/Dusknoir_PRE_037_md.webp"},
  { id: "a1", name: "Gardevoir EX", imageUrl: "/api/images/Paldean_Fates_PAF/Gardevoir_ex_PAF_029_md.webp"},
  { id: "a2", name: "Ditto", imageUrl: "/api/images/Delta_Species_DS/Ditto_DS_40_md.webp"},
  { id: "a3", name: "Ditto", imageUrl: "/api/images/Delta_Species_DS/Ditto_DS_61_md.webp"},
  { id: "a4", name: "Alolan Dugtrio", imageUrl: "/api/images/Surging_Sparks_SSP/Alolan_Dugtrio_SSP_208_md.webp"},
  { id: "a5", name: "Radiant Charizard", imageUrl: "/api/images/Pokémon_GO_PGO/Radiant_Charizard_PGO_011_md.webp"},
  { id: "a6", name: "Ceruledge EX", imageUrl: "/api/images/Surging_Sparks_SSP/Ceruledge_ex_SSP_036_md.webp"},
  { id: "a7", name: "Mega Lucario", imageUrl: "/api/images/Mega_Evolution_MEG/Mega_Lucario_ex_MEG_077_md.webp"},
  { id: "a8", name: "Mega Kangaskhan", imageUrl: "/api/images/Mega_Evolution_MEG/Mega_Kangaskhan_ex_MEG_104_md.webp"},
  { id: "a9", name: "Mega Charizard", imageUrl: "/api/images/Phantasmal_Flames_PFL/Mega_Charizard_X_ex_PFL_125_md.webp"},
  { id: "a10", name: "Ditto", imageUrl: "/api/images/Delta_Species_DS/Ditto_DS_36_md.webp"},
  { id: "a11", name: "Ditto", imageUrl: "/api/images/Delta_Species_DS/Ditto_DS_39_md.webp"},
  { id: "a12", name: "Mew EX", imageUrl: "/api/images/Pokémon_151_MEW/Mew_ex_MEW_151_md.webp"},
  { id: "a13", name: "N's Zoroark", imageUrl: "/api/images/Journey_Together_JTG/Ns_Zoroark_ex_JTG_098_md.webp"},
  { id: "a14", name: "Gholdengho", imageUrl: "/api/images/Paradox_Rift_PAR/Gholdengo_ex_PAR_139_md.webp"},
  { id: "a15", name: "Charizard EX", imageUrl: "/api/images/Obsidian_Flames_OBF/Charizard_ex_OBF_125_md.webp"},
  { id: "a16", name: "Charizard EX", imageUrl: "/api/images/Obsidian_Flames_OBF/Charizard_ex_OBF_223_md.webp"},
  { id: "a17", name: "Slakoth", imageUrl: "/api/images/Surging_Sparks_SSP/Slakoth_SSP_212_md.webp"},
  { id: "a18", name: "Ditto", imageUrl: "/api/images/Crown_Zenith_CRZ/Ditto_CRZ_GG22_md.webp"},
  { id: "a19", name: "Ditto", imageUrl: "/api/images/Crown_Zenith_CRZ/Ditto_CRZ_107_md.webp"},
  { id: "a20", name: "Mega Sharpedo", imageUrl: "/api/images/Phantasmal_Flames_PFL/Mega_Sharpedo_ex_PFL_061_md.webp"},
  { id: "a21", name: "Skarmory", imageUrl: "/api/images/Surging_Sparks_SSP/Skarmory_SSP_209_md.webp"},
  { id: "a22", name: "Lillies Clefairy", imageUrl: "/api/images/Journey_Together_JTG/Lillies_Clefairy_ex_JTG_056_md.webp"},
  { id: "a23", name: "Bloodmoon Ursaluna", imageUrl: "/api/images/Twilight_Masquerade_TWM/Bloodmoon_Ursaluna_ex_TWM_141_md.webp"},
  { id: "a24", name: "Greninja EX", imageUrl: "/api/images/Twilight_Masquerade_TWM/Greninja_ex_TWM_106_md.webp"},
  { id: "a25", name: "Miraidon EX", imageUrl: "/api/images/Scarlet_Violet_SVI/Miraidon_ex_SVI_081_md.webp"},
  { id: "xy1-96", name: "Xerneas", imageUrl: "/api/images/XY_XY/Xerneas_XY_96_md.webp" }
];


// Get random cards from static array - no DB queries
export function getRandomHeroCards(count: number = 8): HeroCard[] {
  const shuffled = [...HERO_CARDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
