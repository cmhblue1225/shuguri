/**
 * Document Classifier for cppreference.com pages
 * Classifies HTML documents by C++ version (cpp11, cpp14, cpp17, cpp20, cpp23, cpp26)
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { parseHtmlDocument, type ParsedDocument } from './parse-html-docs.js'

export type CppVersion = 'cpp11' | 'cpp14' | 'cpp17' | 'cpp20' | 'cpp23' | 'cpp26'

export interface ClassificationResult {
  filename: string
  url: string
  title: string
  versions: CppVersion[]
  confidence: 'high' | 'medium' | 'low'
  category: 'language' | 'library' | 'header' | 'general'
  reason: string
}

// Features introduced in C++11 (URL patterns)
const CPP11_FEATURES = [
  'lambda', 'range-for', 'auto', 'decltype', 'nullptr', 'constexpr',
  'unique_ptr', 'shared_ptr', 'weak_ptr', 'thread', 'mutex', 'atomic',
  'chrono', 'regex', 'tuple', 'array', 'unordered_map', 'unordered_set',
  'forward_list', 'move_iterator', 'move_constructor', 'move_operator',
  'rvalue', 'initializer_list', 'list_initialization', 'type_alias',
  'parameter_pack', 'variadic', 'user_literal', 'noexcept', 'alignof',
  'alignas', 'static_assert', 'enum', 'final', 'override', 'default',
  'deleted', 'future', 'promise', 'async', 'condition_variable',
  'scoped_allocator', 'type_traits', 'ratio', 'random', 'function',
  'bind', 'reference_wrapper', 'memory_model',
]

// Features introduced in C++17 (URL patterns)
const CPP17_FEATURES = [
  'structured_binding', 'if_constexpr', 'fold', 'optional', 'variant',
  'any', 'string_view', 'filesystem', 'execution', 'parallel',
  'invoke', 'apply', 'clamp', 'gcd', 'lcm', 'sample', 'reduce',
  'transform_reduce', 'exclusive_scan', 'inclusive_scan', 'launder',
  'byte', 'memory_resource', 'polymorphic_allocator', 'scoped_lock',
  'shared_mutex', 'hardware_destructive_interference',
  'hardware_constructive_interference', 'nodiscard', 'maybe_unused',
  'fallthrough', 'has_include', 'deduction_guides', 'ctad',
  'inline_variables', 'guaranteed_copy_elision', 'copy_elision',
  'charconv', 'from_chars', 'to_chars', 'void_t', 'bool_constant',
  'is_invocable', 'is_aggregate', 'conjunction', 'disjunction', 'negation',
]

// Features introduced in C++14 (URL patterns)
const CPP14_FEATURES = [
  'generic_lambda', 'init_captures', 'return_type_deduction', 'binary_literal',
  'digit_separator', 'variable_template', 'deprecated', 'make_unique',
  'shared_timed_mutex', 'integer_sequence', 'exchange', 'quoted',
  'get_by_type', 'is_final', 'is_null_pointer', 'heterogeneous_lookup',
  'user_defined_literals_std', 'equal_mismatch_is_permutation',
  'transparent_operators', 'index_sequence', 'make_index_sequence',
]

// Features removed in C++17 (deprecated in C++11/14)
const CPP17_REMOVED = [
  'auto_ptr', 'random_shuffle', 'unexpected', 'ptr_fun', 'mem_fun',
  'bind1st', 'bind2nd', 'codecvt', 'raw_storage_iterator',
  'get_temporary_buffer', 'is_literal_type',
]

// Features introduced in C++20 (URL patterns)
const CPP20_FEATURES = [
  'concept', 'requires', 'range', 'coroutine', 'co_await', 'co_yield', 'co_return',
  'module', 'import', 'export', 'consteval', 'constinit', 'three_way_comparison',
  'spaceship', 'span', 'format', 'source_location', 'jthread', 'latch', 'barrier',
  'semaphore', 'stop_token', 'atomic_ref', 'atomic_flag', 'destroying_delete',
  'char8_t', 'endian', 'bit_cast', 'countl_zero', 'countl_one', 'countr_zero',
  'countr_one', 'popcount', 'rotl', 'rotr', 'byteswap', 'has_single_bit',
  'bit_ceil', 'bit_floor', 'bit_width', 'ispow2', 'midpoint', 'lerp',
  'assume_aligned', 'to_address', 'make_shared_for_overwrite',
  'make_unique_for_overwrite', 'starts_with', 'ends_with', 'contains',
  'remove_cvref', 'type_identity', 'common_reference', 'iter_value_t',
  'iter_reference_t', 'iter_difference_t', 'readable', 'writable',
  'weakly_incrementable', 'incrementable', 'input_iterator', 'output_iterator',
  'forward_iterator', 'bidirectional_iterator', 'random_access_iterator',
  'contiguous_iterator', 'sentinel_for', 'sized_sentinel_for', 'input_range',
  'output_range', 'forward_range', 'bidirectional_range', 'random_access_range',
  'contiguous_range', 'common_range', 'viewable_range', 'view', 'borrowed_range',
  'dangling', 'safe_iterator', 'subrange', 'empty_view', 'single_view',
  'iota_view', 'filter_view', 'transform_view', 'take_view', 'take_while_view',
  'drop_view', 'drop_while_view', 'join_view', 'split_view', 'counted_view',
  'common_view', 'reverse_view', 'elements_view', 'keys_view', 'values_view',
  'ref_view', 'all_view', 'likely', 'unlikely', 'no_unique_address',
  'designated_initializer', 'template_lambda', 'default_comparisons',
  'aggregate_paren_init', 'using_enum', 'constexpr_dynamic_alloc',
  'constexpr_virtual', 'constexpr_try_catch', 'constexpr_union',
  'constexpr_dynamic_cast', 'constexpr_string', 'constexpr_vector',
  'erase_if', 'ssize', 'to_array', 'make_obj_using_allocator',
  'uninitialized_construct_using_allocator', 'basic_common_reference',
  'polymorphic_allocator', 'synchronized_pool_resource', 'unsynchronized_pool_resource',
  'monotonic_buffer_resource', 'assume', 'unreachable',
]

// Features introduced in C++23 (URL patterns)
const CPP23_FEATURES = [
  'expected', 'mdspan', 'print', 'println', 'flat_map', 'flat_set',
  'flat_multimap', 'flat_multiset', 'generator', 'basic_stacktrace',
  'stacktrace_entry', 'move_only_function', 'function_ref', 'copyable_function',
  'reference_wrapper_for_function', 'invoke_r', 'bind_back', 'bind_front',
  'overload', 'tuple_like', 'pair_like', 'basic_string_view_constructor',
  'deducing_this', 'explicit_this', 'multidimensional_subscript',
  'if_consteval', 'static_operator', 'static_call_operator',
  'literal_suffix_for_size_t', 'assume', 'unreachable', 'byteswap',
  'to_underlying', 'is_scoped_enum', 'forward_like', 'construct_at',
  'destroy_at', 'ranges_to', 'ranges_contains', 'ranges_contains_subrange',
  'ranges_find_last', 'ranges_fold', 'ranges_fold_left', 'ranges_fold_right',
  'ranges_shift_left', 'ranges_shift_right', 'ranges_iota',
  'chunk_view', 'slide_view', 'stride_view', 'repeat_view', 'cartesian_product_view',
  'as_const_view', 'as_rvalue_view', 'zip_view', 'zip_transform_view',
  'adjacent_view', 'adjacent_transform_view', 'chunk_by_view', 'join_with_view',
  'lazy_split_view', 'enumerate_view', 'const_iterator', 'basic_const_iterator',
  'make_const_iterator', 'make_const_sentinel', 'cbegin', 'cend',
  'out_ptr', 'inout_ptr', 'spanstream', 'basic_ispanstream', 'basic_ospanstream',
  'basic_spanbuf', 'basic_spanstream', 'formatted_size', 'vformat_to',
]

// Features introduced in C++26 (URL patterns)
const CPP26_FEATURES = [
  'contract', 'pre', 'post', 'assert', 'contract_assert', 'contract_violation',
  'reflection', 'meta', 'reflexpr', 'splice', 'static_reflection',
  'constexpr_cast', 'pack_indexing', 'placeholder_index',
  'structured_binding_pack', 'pack_declaration', 'variadic_friend',
  'static_assert_with_message', 'constexpr_placement_new',
  'trivial_infinite_loop', 'erroneous_behavior', 'hazard_pointer',
  'rcu', 'read_copy_update', 'concurrent_unordered_map', 'concurrent_unordered_set',
  'debugging', 'breakpoint', 'breakpoint_if_debugging', 'is_debugger_present',
  'submdspan', 'mdspan_extents', 'dextents', 'layout_left', 'layout_right',
  'layout_stride', 'default_accessor', 'aligned_accessor',
  'function_signature', 'callable_traits', 'copyable_function', 'movable_function',
  'sender', 'receiver', 'scheduler', 'execution', 'just', 'then', 'upon',
  'let', 'bulk', 'split', 'when_all', 'transfer', 'on', 'schedule_from',
  'when_any', 'into_optional', 'stopped_as_optional', 'stopped_as_error',
  'sender_adaptor', 'receiver_adaptor', 'scheduler_adaptor',
  'text_encoding', 'locale_encoding', 'wide_encoding', 'narrow_encoding',
  'char_encoding', 'byte_encoding', 'is_encoding_compatible',
]

// URL patterns that explicitly mention a version
const VERSION_URL_PATTERNS: Record<CppVersion, string[]> = {
  cpp11: ['/cpp/11', '/11.html'],
  cpp14: ['/cpp/14', '/14.html'],
  cpp17: ['/cpp/17', '/17.html'],
  cpp20: ['/cpp/20', '/20.html'],
  cpp23: ['/cpp/23', '/23.html'],
  cpp26: ['/cpp/26', '/26.html'],
}

// All C++ versions in order
const ALL_VERSIONS: CppVersion[] = ['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']

// Feature lists by version
const VERSION_FEATURES: Record<CppVersion, string[]> = {
  cpp11: CPP11_FEATURES,
  cpp14: CPP14_FEATURES,
  cpp17: CPP17_FEATURES,
  cpp20: CPP20_FEATURES,
  cpp23: CPP23_FEATURES,
  cpp26: CPP26_FEATURES,
}

/**
 * Classify a document by C++ version
 */
export function classifyDocument(
  doc: ParsedDocument,
  url: string
): ClassificationResult {
  const versions: Set<CppVersion> = new Set()
  const reasons: string[] = []
  let confidence: 'high' | 'medium' | 'low' = 'low'

  const urlLower = url.toLowerCase()
  const contentLower = doc.content.toLowerCase()

  // 1. Check explicit version URLs for all versions
  for (const version of ALL_VERSIONS) {
    if (VERSION_URL_PATTERNS[version].some(p => urlLower.includes(p))) {
      versions.add(version)
      confidence = 'high'
      reasons.push(`URL contains ${version.toUpperCase().replace('CPP', 'C++')} reference`)
    }
  }

  // 2. Check version markers in content (from HTML parsing)
  for (const marker of doc.metadata.versionMarkers) {
    const markerVersion = marker.version as CppVersion
    if (ALL_VERSIONS.includes(markerVersion) && marker.type === 'since') {
      versions.add(markerVersion)
      if (confidence !== 'high') confidence = 'medium'
      reasons.push(`Has ${markerVersion.toUpperCase().replace('CPP', 'C++')} since marker`)
    }
  }

  // 3. Check URL for version-specific features
  for (const version of ALL_VERSIONS) {
    const features = VERSION_FEATURES[version]
    for (const feature of features) {
      if (urlLower.includes(feature.toLowerCase()) ||
          urlLower.includes(feature.replace(/_/g, '-'))) {
        versions.add(version)
        if (confidence !== 'high') confidence = 'medium'
        reasons.push(`URL matches ${version.toUpperCase().replace('CPP', 'C++')} feature: ${feature}`)
        break
      }
    }
  }

  // 4. Check URL for C++17 removed features (assign to older versions + C++17 for migration context)
  for (const feature of CPP17_REMOVED) {
    if (urlLower.includes(feature.toLowerCase()) ||
        urlLower.includes(feature.replace(/_/g, '-'))) {
      versions.add('cpp11') // Existed in C++11
      versions.add('cpp14') // Existed in C++14
      versions.add('cpp17') // Relevant for C++17 migration
      reasons.push(`Removed in C++17: ${feature}`)
      break
    }
  }

  // 5. Check content for version mentions (all versions)
  const versionPatterns: { version: CppVersion; patterns: string[] }[] = [
    { version: 'cpp11', patterns: ['c++11', '(since c++11)', 'since-cxx11'] },
    { version: 'cpp14', patterns: ['c++14', '(since c++14)', 'since-cxx14'] },
    { version: 'cpp17', patterns: ['c++17', '(since c++17)', 'since-cxx17'] },
    { version: 'cpp20', patterns: ['c++20', '(since c++20)', 'since-cxx20'] },
    { version: 'cpp23', patterns: ['c++23', '(since c++23)', 'since-cxx23'] },
    { version: 'cpp26', patterns: ['c++26', '(since c++26)', 'since-cxx26'] },
  ]

  for (const { version, patterns } of versionPatterns) {
    if (patterns.some(p => contentLower.includes(p))) {
      versions.add(version)
      if (reasons.length === 0 || !reasons.some(r => r.includes(version))) {
        reasons.push(`Content mentions ${version.toUpperCase().replace('CPP', 'C++')}`)
      }
    }
  }

  // 6. If still no version assigned, check if it's a general reference
  if (versions.size === 0) {
    // General reference pages are useful for all versions
    const isGeneralRef =
      doc.metadata.category === 'general' ||
      url.includes('/cpp.html') ||
      url.includes('/language.html') ||
      url.includes('/standard_library') ||
      url.includes('/headers.html') ||
      url.includes('/container.html') ||
      url.includes('/algorithm.html') ||
      url.includes('/iterator.html') ||
      url.includes('/string.html') ||
      url.includes('/io.html') ||
      url.includes('/numeric.html') ||
      url.includes('/memory.html') ||
      url.includes('/utility.html')

    if (isGeneralRef) {
      // Assign to all versions
      ALL_VERSIONS.forEach(v => versions.add(v))
      confidence = 'low'
      reasons.push('General reference page - assigned to all versions')
    } else {
      // Default: assign to all if uncertain
      ALL_VERSIONS.forEach(v => versions.add(v))
      confidence = 'low'
      reasons.push('No specific version detected - assigned to all versions')
    }
  }

  return {
    filename: doc.metadata.filename,
    url,
    title: doc.title,
    versions: Array.from(versions),
    confidence,
    category: doc.metadata.category,
    reason: reasons.join('; '),
  }
}

/**
 * Classify all documents from the scrapped folder
 * @param source - Source folder name ('scrapped' or 'scrapped1')
 */
export async function classifyAllDocuments(source: string = 'scrapped'): Promise<ClassificationResult[]> {
  const scrappedDir = join(process.cwd(), source)
  const indexPath = join(scrappedDir, 'index.json')

  const indexContent = await readFile(indexPath, 'utf-8')
  const urlToFile = JSON.parse(indexContent) as Record<string, string>

  const results: ClassificationResult[] = []
  const entries = Object.entries(urlToFile)
  let processed = 0

  console.log(`Classifying ${entries.length} documents from ${source}...`)

  for (const [url, filename] of entries) {
    try {
      const filePath = join(scrappedDir, filename)
      const doc = await parseHtmlDocument(filePath, url)
      const classification = classifyDocument(doc, url)
      results.push(classification)

      processed++
      if (processed % 50 === 0) {
        console.log(`Processed ${processed}/${entries.length}`)
      }
    } catch (err) {
      console.error(`Failed to classify ${filename}:`, err)
    }
  }

  console.log(`\nClassification complete!`)

  // Summary - count documents containing each version
  const versionCounts: Record<CppVersion, number> = {
    cpp11: 0,
    cpp14: 0,
    cpp17: 0,
    cpp20: 0,
    cpp23: 0,
    cpp26: 0,
  }

  // Count documents by version (a document can belong to multiple versions)
  for (const result of results) {
    for (const version of result.versions) {
      versionCounts[version]++
    }
  }

  // Count by exclusivity
  const versionOnlyCounts: Record<string, number> = {}
  for (const version of ALL_VERSIONS) {
    versionOnlyCounts[version] = results.filter(
      r => r.versions.length === 1 && r.versions[0] === version
    ).length
  }
  const multiVersionCount = results.filter(r => r.versions.length > 1).length

  const highConf = results.filter(r => r.confidence === 'high')
  const medConf = results.filter(r => r.confidence === 'medium')
  const lowConf = results.filter(r => r.confidence === 'low')

  console.log(`\nSummary:`)
  console.log(`  Total documents: ${results.length}`)
  console.log(`\n  Documents by version (may overlap):`)
  for (const version of ALL_VERSIONS) {
    console.log(`    ${version.toUpperCase().replace('CPP', 'C++')}: ${versionCounts[version]}`)
  }
  console.log(`\n  Single version documents:`)
  for (const version of ALL_VERSIONS) {
    console.log(`    ${version.toUpperCase().replace('CPP', 'C++')} only: ${versionOnlyCounts[version]}`)
  }
  console.log(`  Multiple versions: ${multiVersionCount}`)
  console.log(`\n  Confidence levels:`)
  console.log(`    High: ${highConf.length}`)
  console.log(`    Medium: ${medConf.length}`)
  console.log(`    Low: ${lowConf.length}`)

  // Save results
  const outputFilename = source === 'scrapped'
    ? 'classification-result.json'
    : `classification-result-${source}.json`
  const outputPath = join(process.cwd(), 'scripts', outputFilename)
  await writeFile(outputPath, JSON.stringify(results, null, 2))
  console.log(`\nResults saved to: ${outputPath}`)

  return results
}

/**
 * Parse command line arguments
 */
function parseArgs(): { source: string } {
  const args = process.argv.slice(2)
  let source = 'scrapped'

  for (const arg of args) {
    if (arg.startsWith('--source=')) {
      source = arg.split('=')[1]
    }
  }

  return { source }
}

/**
 * Main entry point
 */
async function main() {
  const { source } = parseArgs()
  console.log(`\nSource folder: ${source}`)
  await classifyAllDocuments(source)
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  main().catch(console.error)
}

export { main as classifyDocs, ALL_VERSIONS, type CppVersion }
