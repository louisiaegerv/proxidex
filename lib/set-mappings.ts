/**
 * Set Mappings - Official set codes to folder names and display names
 * 
 * This file maps official Pokémon TCG set abbreviations (used by players)
 * to the folder structure and display names used in the app.
 * 
 * AUTO-GENERATED from C:\Users\louis\Coding\pokemon-card-images
 * Total sets: 189
 * 
 * To add a new set:
 * 1. Create folder: {SetName}_{SetCode}
 * 2. Add entry below
 * 3. Re-run: npx tsx scripts/index-cards.ts
 */

export interface SetMapping {
  folder: string   // Your folder name: "Obsidian_Flames_OBF"
  name: string     // Display name: "Obsidian Flames"
}

export const SET_MAPPINGS: Record<string, SetMapping> = {
  // ==================== ENERGY & SPECIAL ====================
  "2010Unnumbered": { folder: "HS_Energy_2010_Unnumbered_2010Unnumbered", name: "HS Energy 2010 Unnumbered" },
  "2011Unnumbered": { folder: "Black_White_Energy_2011_Unnumbered_2011Unnumbered", name: "Black & White Energy 2011 Unnumbered" },
  "2013Unnumbered": { folder: "XY_Energy_2013_Unnumbered_2013Unnumbered", name: "XY Energy 2013 Unnumbered" },
  "BrilliantStars": { folder: "Sword_Shield_Energy_Brilliant_Stars_BrilliantStars", name: "Sword & Shield Energy Brilliant Stars" },
  "MEE": { folder: "Mega_Evolution_Energy_MEE", name: "Mega Evolution Energy" },
  "SVE": { folder: "Scarlet_Violet_Energy_SVE", name: "Scarlet & Violet Energy" },
  "TeamUp": { folder: "Sun_Moon_Energy_Team_Up_TeamUp", name: "Sun & Moon Energy Team Up" },
  
  // ==================== McDONALD'S COLLECTIONS ====================
  "MCD11": { folder: "McDonalds_Collection_2011_MCD11", name: "McDonald's Collection 2011" },
  "MCD12": { folder: "McDonalds_Collection_2012_MCD12", name: "McDonald's Collection 2012" },
  "MCD16": { folder: "McDonalds_Collection_2016_MCD16", name: "McDonald's Collection 2016" },
  "MCD19": { folder: "McDonalds_Collection_2019_MCD19", name: "McDonald's Collection 2019" },
  "MCD21": { folder: "McDonalds_Collection_2021_MCD21", name: "McDonald's Collection 2021" },
  "MCD22": { folder: "McDonalds_Collection_2022_MCD22", name: "McDonald's Collection 2022" },
  "M23": { folder: "McDonalds_Match_Battle_2023_M23", name: "McDonald's Match Battle 2023" },
  
  // ==================== POP SERIES ====================
  "P1": { folder: "POP_Series_1_P1", name: "POP Series 1" },
  "P2": { folder: "POP_Series_2_P2", name: "POP Series 2" },
  "P3": { folder: "POP_Series_3_P3", name: "POP Series 3" },
  "P4": { folder: "POP_Series_4_P4", name: "POP Series 4" },
  "P5": { folder: "POP_Series_5_P5", name: "POP Series 5" },
  "P6": { folder: "POP_Series_6_P6", name: "POP Series 6" },
  "P7": { folder: "POP_Series_7_P7", name: "POP Series 7" },
  "P8": { folder: "POP_Series_8_P8", name: "POP Series 8" },
  "P9": { folder: "POP_Series_9_P9", name: "POP Series 9" },
  
  // ==================== TRAINER KITS ====================
  "TK1A": { folder: "EX_Trainer_KitLatias_TK1A", name: "EX Trainer Kit (Latias)" },
  "TK1O": { folder: "EX_Trainer_KitLatios_TK1O", name: "EX Trainer Kit (Latios)" },
  "TK2M": { folder: "EX_Trainer_KitMinun_TK2M", name: "EX Trainer Kit (Minun)" },
  "TK2P": { folder: "EX_Trainer_KitPlusle_TK2P", name: "EX Trainer Kit (Plusle)" },
  "TK3L": { folder: "Diamond_Pearl_Trainer_KitLucario_TK3L", name: "Diamond & Pearl Trainer Kit (Lucario)" },
  "TK3M": { folder: "Diamond_Pearl_Trainer_KitManaphy_TK3M", name: "Diamond & Pearl Trainer Kit (Manaphy)" },
  "TK4G": { folder: "HS_Trainer_KitGyarados_TK4G", name: "HS Trainer Kit (Gyarados)" },
  "TK4R": { folder: "HS_Trainer_KitRaichu_TK4R", name: "HS Trainer Kit (Raichu)" },
  "TK5E": { folder: "Black_White_Trainer_KitExcadrill_TK5E", name: "Black & White Trainer Kit (Excadrill)" },
  "TK6N": { folder: "XY_Trainer_KitNoivern_TK6N", name: "XY Trainer Kit (Noivern)" },
  "TK6S": { folder: "XY_Trainer_KitSylveon_TK6S", name: "XY Trainer Kit (Sylveon)" },
  "TK7A": { folder: "XY_Trainer_KitBisharp_TK7A", name: "XY Trainer Kit (Bisharp)" },
  "TK7B": { folder: "XY_Trainer_KitWigglytuff_TK7B", name: "XY Trainer Kit (Wigglytuff)" },
  "TK8A": { folder: "XY_Trainer_KitLatias_TK8A", name: "XY Trainer Kit (Latias)" },
  "TK8O": { folder: "XY_Trainer_KitLatios_TK8O", name: "XY Trainer Kit (Latios)" },
  "TK9P": { folder: "XY_Trainer_KitPikachu_Libre_TK9P", name: "XY Trainer Kit (Pikachu Libre)" },
  "TK9S": { folder: "XY_Trainer_KitSuicune_TK9S", name: "XY Trainer Kit (Suicune)" },
  "TK10A": { folder: "Sun_Moon_Trainer_KitAlolan_Raichu_TK10A", name: "Sun & Moon Trainer Kit (Alolan Raichu)" },
  "TK10L": { folder: "Sun_Moon_Trainer_KitLycanroc_TK10L", name: "Sun & Moon Trainer Kit (Lycanroc)" },
  "TK5Z": { folder: "TK5Z", name: "TK5Z" },
  
  // ==================== PROMOS ====================
  "BWP": { folder: "Black_White_Promos_BWP", name: "Black & White Promos" },
  "FUT20": { folder: "Pokémon_Futsal_Promos_2020_FUT20", name: "Pokémon Futsal Promos 2020" },
  "MEG": { folder: "Mega_Evolution_MEG", name: "Mega Evolution" },
  "MEP": { folder: "Mega_Evolution_Promos_MEP", name: "Mega Evolution Promos" },
  "SMP": { folder: "Sun_Moon_Promos_SMP", name: "Sun & Moon Promos" },
  "SVP": { folder: "Scarlet_Violet_Promos_SVP", name: "Scarlet & Violet Promos" },
  "XYP": { folder: "XY_Promos_XYP", name: "XY Promos" },
  
  // ==================== SCARLET & VIOLET ERA ====================
  "SVI": { folder: "Scarlet_Violet_SVI", name: "Scarlet & Violet" },
  "PAL": { folder: "Paldea_Evolved_PAL", name: "Paldea Evolved" },
  "OBF": { folder: "Obsidian_Flames_OBF", name: "Obsidian Flames" },
  "MEW": { folder: "Pokémon_151_MEW", name: "Pokémon 151" },
  "PAF": { folder: "Paldean_Fates_PAF", name: "Paldean Fates" },
  "PAR": { folder: "Paradox_Rift_PAR", name: "Paradox Rift" },
  "PRE": { folder: "Prismatic_Evolutions_PRE", name: "Prismatic Evolutions" },
  "TEF": { folder: "Temporal_Forces_TEF", name: "Temporal Forces" },
  "TWM": { folder: "Twilight_Masquerade_TWM", name: "Twilight Masquerade" },
  "SCR": { folder: "Stellar_Crown_SCR", name: "Stellar Crown" },
  "SSP": { folder: "Surging_Sparks_SSP", name: "Surging Sparks" },
  "SFA": { folder: "Shrouded_Fable_SFA", name: "Shrouded Fable" },
  "JTG": { folder: "Journey_Together_JTG", name: "Journey Together" },
  
  // ==================== SWORD & SHIELD ERA ====================
  "SSH": { folder: "Sword_Shield_SSH", name: "Sword & Shield" },
  "RCL": { folder: "Rebel_Clash_RCL", name: "Rebel Clash" },
  "DAA": { folder: "Darkness_Ablaze_DAA", name: "Darkness Ablaze" },
  "CPA": { folder: "Champions_Path_CPA", name: "Champion's Path" },
  "VIV": { folder: "Vivid_Voltage_VIV", name: "Vivid Voltage" },
  "SHF": { folder: "Shining_Fates_SHF", name: "Shining Fates" },
  "BST": { folder: "Battle_Styles_BST", name: "Battle Styles" },
  "CRE": { folder: "Chilling_Reign_CRE", name: "Chilling Reign" },
  "EVS": { folder: "Evolving_Skies_EVS", name: "Evolving Skies" },
  "CEL": { folder: "Celebrations_CEL", name: "Celebrations" },
  "FST": { folder: "Fusion_Strike_FST", name: "Fusion Strike" },
  "BRS": { folder: "Brilliant_Stars_BRS", name: "Brilliant Stars" },
  "ASR": { folder: "Astral_Radiance_ASR", name: "Astral Radiance" },
  "PGO": { folder: "Pokémon_GO_PGO", name: "Pokémon GO" },
  "LOR": { folder: "Lost_Origin_LOR", name: "Lost Origin" },
  "SIT": { folder: "Silver_Tempest_SIT", name: "Silver Tempest" },
  "CRZ": { folder: "Crown_Zenith_CRZ", name: "Crown Zenith" },
  
  // ==================== SUN & MOON ERA ====================
  "SUM": { folder: "Sun_Moon_SUM", name: "Sun & Moon" },
  "GRI": { folder: "Guardians_Rising_GRI", name: "Guardians Rising" },
  "BUS": { folder: "Burning_Shadows_BUS", name: "Burning Shadows" },
  "SHL": { folder: "Shining_Legends_SLG", name: "Shining Legends" },
  "CIN": { folder: "Crimson_Invasion_CIN", name: "Crimson Invasion" },
  "UPR": { folder: "Ultra_Prism_UPR", name: "Ultra Prism" },
  "FLI": { folder: "Forbidden_Light_FLI", name: "Forbidden Light" },
  "CES": { folder: "Celestial_Storm_CES", name: "Celestial Storm" },
  "DRM": { folder: "Dragon_Majesty_DRM", name: "Dragon Majesty" },
  "LOT": { folder: "Lost_Thunder_LOT", name: "Lost Thunder" },
  "TEU": { folder: "Team_Up_TEU", name: "Team Up" },
  "UNB": { folder: "Unbroken_Bonds_UNB", name: "Unbroken Bonds" },
  "UNM": { folder: "Unified_Minds_UNM", name: "Unified Minds" },
  "HIF": { folder: "Hidden_Fates_HIF", name: "Hidden Fates" },
  "CEC": { folder: "Cosmic_Eclipse_CEC", name: "Cosmic Eclipse" },
  
  // ==================== XY ERA ====================
  "XY": { folder: "XY", name: "XY" },
  "FLF": { folder: "Flashfire_FLF", name: "Flashfire" },
  "FFI": { folder: "Furious_Fists_FFI", name: "Furious Fists" },
  "PHF": { folder: "Phantom_Forces_PHF", name: "Phantom Forces" },
  "PRC": { folder: "Primal_Clash_PRC", name: "Primal Clash" },
  "ROS": { folder: "Roaring_Skies_ROS", name: "Roaring Skies" },
  "AOR": { folder: "Ancient_Origins_AOR", name: "Ancient Origins" },
  "BKT": { folder: "BREAKthrough_BKT", name: "BREAKthrough" },
  "BKP": { folder: "BREAKpoint_BKP", name: "BREAKpoint" },
  "FCO": { folder: "Fates_Collide_FCO", name: "Fates Collide" },
  "STS": { folder: "Steam_Siege_STS", name: "Steam Siege" },
  "EVO": { folder: "Evolutions_EVO", name: "Evolutions" },
  "GEN": { folder: "Generations_GEN", name: "Generations" },
  "KSS": { folder: "Kalos_Starter_Set_KSS", name: "Kalos Starter Set" },
  
  // ==================== BLACK & WHITE ERA ====================
  "BLW": { folder: "Black_White_BLW", name: "Black & White" },
  "EPO": { folder: "Emerging_Powers_EPO", name: "Emerging Powers" },
  "NVI": { folder: "Noble_Victories_NVI", name: "Noble Victories" },
  "NXD": { folder: "Next_Destinies_NXD", name: "Next Destinies" },
  "DEX": { folder: "Dark_Explorers_DEX", name: "Dark Explorers" },
  "DRX": { folder: "Dragons_Exalted_DRX", name: "Dragons Exalted" },
  "DRV": { folder: "Dragon_Vault_DRV", name: "Dragon Vault" },
  "BCR": { folder: "Boundaries_Crossed_BCR", name: "Boundaries Crossed" },
  "PLS": { folder: "Plasma_Storm_PLS", name: "Plasma Storm" },
  "PLF": { folder: "Plasma_Freeze_PLF", name: "Plasma Freeze" },
  "PLB": { folder: "Plasma_Blast_PLB", name: "Plasma Blast" },
  "LTR": { folder: "Legendary_Treasures_LTR", name: "Legendary Treasures" },
  
  // ==================== HEARTGOLD & SOULSILVER ERA ====================
  "HS": { folder: "HeartGold_SoulSilver_HS", name: "HeartGold & SoulSilver" },
  "UL": { folder: "Unleashed_UL", name: "Unleashed" },
  "UD": { folder: "Undaunted_UD", name: "Undaunted" },
  "TM": { folder: "Triumphant_TM", name: "Triumphant" },
  "CL": { folder: "Call_of_Legends_CL", name: "Call of Legends" },
  
  // ==================== PLATINUM ERA ====================
  "PL": { folder: "Platinum_PL", name: "Platinum" },
  "RR": { folder: "Rising_Rivals_RR", name: "Rising Rivals" },
  "SV": { folder: "Supreme_Victors_SV", name: "Supreme Victors" },
  "AR": { folder: "Arceus_AR", name: "Arceus" },
  
  // ==================== DIAMOND & PEARL ERA ====================
  "DP": { folder: "Diamond_Pearl_DP", name: "Diamond & Pearl" },
  "MT": { folder: "Mysterious_Treasures_MT", name: "Mysterious Treasures" },
  "SW": { folder: "Secret_Wonders_SW", name: "Secret Wonders" },
  "GE": { folder: "Great_Encounters_GE", name: "Great Encounters" },
  "MD": { folder: "Majestic_Dawn_MD", name: "Majestic Dawn" },
  "LA": { folder: "Legends_Awakened_LA", name: "Legends Awakened" },
  "SF": { folder: "Stormfront_SF", name: "Stormfront" },
  
  // ==================== EX ERA ====================
  "RS": { folder: "Ruby_Sapphire_RS", name: "Ruby & Sapphire" },
  "SS": { folder: "Sandstorm_SS", name: "Sandstorm" },
  "DR": { folder: "Dragon_DR", name: "Dragon" },
  "MA": { folder: "Team_Magma_vs_Aqua_MA", name: "Team Magma vs Team Aqua" },
  "HL": { folder: "Hidden_Legends_HL", name: "Hidden Legends" },
  "RG": { folder: "FireRed_LeafGreen_RG", name: "FireRed & LeafGreen" },
  "TRR": { folder: "Team_Rocket_Returns_TR", name: "Team Rocket Returns" },
  "DX": { folder: "Deoxys_DX", name: "Deoxys" },
  "EM": { folder: "Emerald_EM", name: "Emerald" },
  "UF": { folder: "Unseen_Forces_UF", name: "Unseen Forces" },
  "DS": { folder: "Delta_Species_DS", name: "Delta Species" },
  "LM": { folder: "Legend_Maker_LM", name: "Legend Maker" },
  "HP": { folder: "Holon_Phantoms_HP", name: "Holon Phantoms" },
  "CG": { folder: "Crystal_Guardians_CG", name: "Crystal Guardians" },
  "DF": { folder: "Dragon_Frontiers_DF", name: "Dragon Frontiers" },
  "PK": { folder: "Power_Keepers_PK", name: "Power Keepers" },
  
  // ==================== WIZARDS ERA (BASE/JUNGLE/FOSSIL) ====================
  "BS": { folder: "Base_Set_BS", name: "Base Set" },
  "B2": { folder: "Base_Set_2_B2", name: "Base Set 2" },
  "JU": { folder: "Jungle_JU", name: "Jungle" },
  "FO": { folder: "Fossil_FO", name: "Fossil" },
  "TR": { folder: "Team_Rocket_RO", name: "Team Rocket" },
  "G1": { folder: "Gym_Heroes_G1", name: "Gym Heroes" },
  "G2": { folder: "Gym_Challenge_G2", name: "Gym Challenge" },
  "N1": { folder: "Neo_Genesis_N1", name: "Neo Genesis" },
  "N2": { folder: "Neo_Discovery_N2", name: "Neo Discovery" },
  "N3": { folder: "Neo_Revelation_N3", name: "Neo Revelation" },
  "N4": { folder: "Neo_Destiny_N4", name: "Neo Destiny" },
  "LC": { folder: "Legendary_Collection_LC", name: "Legendary Collection" },
  "EX": { folder: "Expedition_EX", name: "Expedition" },
  "AQ": { folder: "Aquapolis_AQ", name: "Aquapolis" },
  "SK": { folder: "Skyridge_SK", name: "Skyridge" },
  "SI": { folder: "Southern_Islands_SI", name: "Southern Islands" },
  
  // ==================== SPECIAL SETS ====================
  "RM": { folder: "Rumble_RM", name: "Rumble" },
  "DET": { folder: "Detective_Pikachu_DET", name: "Detective Pikachu" },
  "SLG": { folder: "Shining_Legends_SLG", name: "Shining Legends" },
  "DCR": { folder: "Double_Crisis_DCR", name: "Double Crisis" },
  "CLV": { folder: "Pokémon_Trading_Card_Game_ClassicVenusaur_CLV", name: "Pokémon Trading Card Game Classic (Venusaur)" },
  "CLC": { folder: "Pokémon_Trading_Card_Game_ClassicCharizard_CLC", name: "Pokémon Trading Card Game Classic (Charizard)" },
  "CLB": { folder: "Pokémon_Trading_Card_Game_ClassicBlastoise_CLB", name: "Pokémon Trading Card Game Classic (Blastoise)" },
  "BLK": { folder: "Black_Bolt_BLK", name: "Black Bolt" },
  "WHT": { folder: "White_Flare_WHT", name: "White Flare" },
  "ASC": { folder: "Ascended_Heroes_ASC", name: "Ascended Heroes" },
  "DRI": { folder: "Destined_Rivals_DRI", name: "Destined Rivals" },
  "POR": { folder: "Perfect_Order_POR", name: "Perfect Order" },
  "PFL": { folder: "Phantasmal_Flames_PFL", name: "Phantasmal Flames" },
}

// Helper functions
export function getFolderName(setCode: string): string | undefined {
  return SET_MAPPINGS[setCode]?.folder
}

export function getSetName(setCode: string): string | undefined {
  return SET_MAPPINGS[setCode]?.name
}

export function getSetCodeByName(name: string): string | undefined {
  const entry = Object.entries(SET_MAPPINGS).find(
    ([, mapping]) => mapping.name.toLowerCase() === name.toLowerCase()
  )
  return entry?.[0]
}

// Get all set codes for dropdowns
export function getAllSets(): Array<{ code: string; name: string; folder: string }> {
  return Object.entries(SET_MAPPINGS).map(([code, mapping]) => ({
    code,
    name: mapping.name,
    folder: mapping.folder,
  }))
}
