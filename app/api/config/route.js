import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return NextResponse.json(configData);
    } catch (error) {
        console.error('Error reading config:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
