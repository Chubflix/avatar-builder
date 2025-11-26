import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let TAGS_CACHE = null; // [{ tag: string, count: number }]

function loadTags() {
  if (TAGS_CACHE) return TAGS_CACHE;
  try {
    // The CSV is located at app/data/danbooru-tags.csv
    const csvPath = path.join(process.cwd(), 'app', 'data', 'danbooru-tags.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    TAGS_CACHE = content
      .split(/\r?\n/) 
      .filter(Boolean)
      .map((line) => {
        const [tag, countStr] = line.split(',');
        return { tag, count: parseInt(countStr || '0', 10) || 0 };
      })
      // sort descending by count so most relevant first
      .sort((a, b) => b.count - a.count);
  } catch (e) {
    TAGS_CACHE = [];
  }
  return TAGS_CACHE;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const prefix = (searchParams.get('prefix') || '').toLowerCase();
  const limit = Math.min(parseInt(searchParams.get('limit') || '3', 10) || 3, 50);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  const all = loadTags();
  let results = all;
  if (prefix) {
    // Fuzzy match: include tags that contain the prefix anywhere (case-insensitive handled above)
    // Still exclude exact-equal matches so we don't suggest what the user already typed
    results = all.filter((t) => t.tag.includes(prefix) && t.tag !== prefix);
  }
  const slice = results.slice(offset, offset + limit);
  return NextResponse.json({
    total: results.length,
    offset,
    limit,
    tags: slice,
  });
}
