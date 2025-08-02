/**
 * Test Dictionary for Diff Analyzer
 *
 * Comprehensive collection of test cases for evaluating and improving
 * the smart adaptive diff algorithm. Each test case includes expected
 * behavior and difficulty level.
 */

export interface DiffTestCase {
  id: string;
  category: string;
  description: string;
  oldText: string;
  newText: string;
  expectedMode: 'character' | 'word' | 'smart';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  notes?: string;
}

export const DIFF_TEST_DICTIONARY: DiffTestCase[] = [
  // ==================== ABBREVIATION EXPANSIONS ====================
  {
    id: 'abbrev_001',
    category: 'abbreviation_expansion',
    description: 'Simple abbreviation expansion - dgn to dengan',
    oldText: 'Tablet dgn kandungan aktif',
    newText: 'Tablet dengan kandungan aktif',
    expectedMode: 'character',
    difficulty: 'easy',
    notes: 'Should highlight only "dgn" -> "dengan"',
  },
  {
    id: 'abbrev_002',
    category: 'abbreviation_expansion',
    description: 'Multiple abbreviations in one text',
    oldText: 'Sediaan utk pasien yg membutuhkan',
    newText: 'Sediaan untuk pasien yang membutuhkan',
    expectedMode: 'character',
    difficulty: 'medium',
    notes: 'Should handle multiple abbreviations correctly',
  },
  {
    id: 'abbrev_003',
    category: 'abbreviation_expansion',
    description: 'Mixed abbreviation and word changes',
    oldText: 'Obat dgn efek samping ringan',
    newText: 'Obat dengan efek samping berat',
    expectedMode: 'smart',
    difficulty: 'hard',
    notes: 'Should detect abbreviation expansion AND word replacement',
  },

  // ==================== WORD REPLACEMENTS ====================
  {
    id: 'word_001',
    category: 'word_replacement',
    description: 'Simple word replacement',
    oldText: 'Tablet berwarna putih',
    newText: 'Tablet berwarna merah',
    expectedMode: 'word',
    difficulty: 'easy',
    notes: 'Clean word-level change',
  },
  {
    id: 'word_002',
    category: 'word_replacement',
    description: 'Multiple word replacements',
    oldText: 'Sediaan cair yang terdiri dari dua cairan',
    newText: 'Sediaan cair dari dua cairan',
    expectedMode: 'word',
    difficulty: 'medium',
    notes: 'Should remove "yang terdiri" cleanly',
  },
  {
    id: 'word_003',
    category: 'word_replacement',
    description: 'Complex sentence restructuring',
    oldText:
      'Sediaan cair yang terdiri dari dua cairan yang tidak saling bercampur',
    newText: 'Sediaan cair dari dua cairan yang tidak saling bercampur',
    expectedMode: 'word',
    difficulty: 'hard',
    notes: 'LCS might over-fragment this - should use word-level',
  },

  // ==================== PUNCTUATION CHANGES ====================
  {
    id: 'punct_001',
    category: 'punctuation',
    description: 'Adding comma',
    oldText: 'Sediaan tablet oral',
    newText: 'Sediaan tablet, oral',
    expectedMode: 'character',
    difficulty: 'easy',
    notes: 'Only punctuation change',
  },
  {
    id: 'punct_002',
    category: 'punctuation',
    description: 'Multiple punctuation changes',
    oldText: 'Obat untuk diabetes hipertensi dan kolesterol',
    newText: 'Obat untuk diabetes, hipertensi, dan kolesterol',
    expectedMode: 'character',
    difficulty: 'medium',
    notes: 'Should handle multiple comma insertions',
  },
  {
    id: 'punct_003',
    category: 'punctuation',
    description: 'Punctuation with abbreviation',
    oldText: 'Tablet dgn bahan aktif utama',
    newText: 'Tablet dengan bahan aktif, utama',
    expectedMode: 'character',
    difficulty: 'hard',
    notes: 'Mixed punctuation and abbreviation changes',
  },

  // ==================== NUMBER AND UNIT CHANGES ====================
  {
    id: 'number_001',
    category: 'number_unit',
    description: 'Simple dosage change',
    oldText: 'Tablet 500mg sekali sehari',
    newText: 'Tablet 250mg sekali sehari',
    expectedMode: 'word',
    difficulty: 'easy',
    notes: 'Number change should use word-level',
  },
  {
    id: 'number_002',
    category: 'number_unit',
    description: 'Multiple number changes',
    oldText: 'Dosis 10mg pagi dan 20mg malam',
    newText: 'Dosis 5mg pagi dan 15mg malam',
    expectedMode: 'word',
    difficulty: 'medium',
    notes: 'Multiple number changes',
  },
  {
    id: 'number_003',
    category: 'number_unit',
    description: 'Unit conversion',
    oldText: 'Larutan 1000ml',
    newText: 'Larutan 1l',
    expectedMode: 'word',
    difficulty: 'hard',
    notes: 'Unit conversion - should be treated as word change',
  },

  // ==================== MIXED COMPLEX CASES ====================
  {
    id: 'mixed_001',
    category: 'mixed_complex',
    description: 'Abbreviation + number + word change',
    oldText: 'Tablet dgn dosis 500mg utk dewasa',
    newText: 'Tablet dengan dosis 250mg untuk anak',
    expectedMode: 'smart',
    difficulty: 'extreme',
    notes: 'Multiple types of changes - algorithm should adapt',
  },
  {
    id: 'mixed_002',
    category: 'mixed_complex',
    description: 'Long text with various changes',
    oldText:
      'Sediaan farmasi berupa tablet salut selaput yg mengandung bahan aktif 500mg utk pengobatan infeksi bakteri pada dewasa',
    newText:
      'Sediaan farmasi berupa tablet salut selaput yang mengandung bahan aktif 250mg untuk pengobatan infeksi virus pada anak',
    expectedMode: 'smart',
    difficulty: 'extreme',
    notes: 'Complex mix requiring intelligent mode selection',
  },

  // ==================== EDGE CASES ====================
  {
    id: 'edge_001',
    category: 'edge_case',
    description: 'Very short text change',
    oldText: 'Ya',
    newText: 'Tidak',
    expectedMode: 'word',
    difficulty: 'easy',
    notes: 'Short text should prefer word-level',
  },
  {
    id: 'edge_002',
    category: 'edge_case',
    description: 'Single character insertion',
    oldText: 'Tablet',
    newText: 'Tablets',
    expectedMode: 'character',
    difficulty: 'medium',
    notes: 'Single character addition',
  },
  {
    id: 'edge_003',
    category: 'edge_case',
    description: 'Completely different texts',
    oldText: 'Tablet untuk sakit kepala',
    newText: 'Sirup untuk batuk pilek',
    expectedMode: 'word',
    difficulty: 'hard',
    notes: 'Very low similarity - should use word-level',
  },
  {
    id: 'edge_004',
    category: 'edge_case',
    description: 'Identical texts',
    oldText: 'Tablet dengan kandungan aktif',
    newText: 'Tablet dengan kandungan aktif',
    expectedMode: 'smart',
    difficulty: 'easy',
    notes: 'Should return unchanged segment quickly',
  },
  {
    id: 'edge_005',
    category: 'edge_case',
    description: 'Typo correction - repeated characters',
    oldText: 'ampulll',
    newText: 'ampul',
    expectedMode: 'character',
    difficulty: 'medium',
    notes: 'Should detect character-level deletion, not word replacement',
  },

  // ==================== MEDICAL TERMINOLOGY ====================
  {
    id: 'medical_001',
    category: 'medical_term',
    description: 'Medical abbreviation expansion',
    oldText: 'Injeksi IV 10ml',
    newText: 'Injeksi intravena 10ml',
    expectedMode: 'character',
    difficulty: 'medium',
    notes: 'Medical abbreviation should be character-level',
  },
  {
    id: 'medical_002',
    category: 'medical_term',
    description: 'Drug name change',
    oldText: 'Mengandung paracetamol 500mg',
    newText: 'Mengandung ibuprofen 400mg',
    expectedMode: 'word',
    difficulty: 'medium',
    notes: 'Drug name and dosage change',
  },
  {
    id: 'medical_003',
    category: 'medical_term',
    description: 'Route of administration change',
    oldText: 'Pemberian secara oral',
    newText: 'Pemberian secara rektal',
    expectedMode: 'word',
    difficulty: 'easy',
    notes: 'Simple medical term replacement',
  },

  // ==================== INDONESIAN LANGUAGE SPECIFICS ====================
  {
    id: 'indo_001',
    category: 'indonesian_specific',
    description: 'Indonesian formal/informal switch',
    oldText: 'Obat ini digunakan oleh pasien',
    newText: 'Obat ini dipake sama pasien',
    expectedMode: 'word',
    difficulty: 'medium',
    notes: 'Formal to informal Indonesian',
  },
  {
    id: 'indo_002',
    category: 'indonesian_specific',
    description: 'Prefix/suffix changes',
    oldText: 'Menggunakan obat ini',
    newText: 'Pemakaian obat ini',
    expectedMode: 'word',
    difficulty: 'hard',
    notes: 'Indonesian morphological changes',
  },

  // ==================== PERFORMANCE TEST CASES ====================
  {
    id: 'perf_001',
    category: 'performance',
    description: 'Long pharmaceutical description',
    oldText:
      'Tablet salut selaput yang mengandung bahan aktif acetaminophen 500mg dengan eksipien microcrystalline cellulose, croscarmellose sodium, povidone, magnesium stearate, dan coating material HPMC untuk pengobatan demam dan nyeri ringan hingga sedang pada pasien dewasa dengan dosis maksimal 4000mg per hari yang harus diminum sesudah makan',
    newText:
      'Tablet salut selaput yang mengandung bahan aktif paracetamol 650mg dengan eksipien microcrystalline cellulose, croscarmellose sodium, povidone, magnesium stearate, dan coating material HPMC untuk pengobatan demam dan nyeri ringan hingga sedang pada pasien dewasa dengan dosis maksimal 3900mg per hari yang harus diminum sesudah makan',
    expectedMode: 'smart',
    difficulty: 'extreme',
    notes: 'Long text with multiple changes - tests performance and accuracy',
  },
];

// Helper function to get test cases by category
export function getTestCasesByCategory(category: string): DiffTestCase[] {
  return DIFF_TEST_DICTIONARY.filter(test => test.category === category);
}

// Helper function to get test cases by difficulty
export function getTestCasesByDifficulty(difficulty: string): DiffTestCase[] {
  return DIFF_TEST_DICTIONARY.filter(test => test.difficulty === difficulty);
}

// Helper function to get all categories
export function getAllCategories(): string[] {
  return [...new Set(DIFF_TEST_DICTIONARY.map(test => test.category))];
}

// Helper function to get test statistics
export function getTestStatistics() {
  const total = DIFF_TEST_DICTIONARY.length;
  const byCategory = getAllCategories().reduce(
    (acc, category) => {
      acc[category] = getTestCasesByCategory(category).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const byDifficulty = ['easy', 'medium', 'hard', 'extreme'].reduce(
    (acc, difficulty) => {
      acc[difficulty] = getTestCasesByDifficulty(difficulty).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    total,
    byCategory,
    byDifficulty,
  };
}
