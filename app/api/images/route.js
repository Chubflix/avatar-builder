import { NextResponse } from 'next/server';
import { getDb, getImagePath, getImageUrl, ensureFolderDirectory, getDescendantFolderIds, getFolderPath } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// GET images with pagination and optional folder filter
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;
        const folderId = searchParams.get('folder_id');
        const includeSubfolders = searchParams.get('include_subfolders') !== 'false';

        const db = getDb();

        let query = `
            SELECT g.*, f.name as folder_name
            FROM generations g
            LEFT JOIN character_folders f ON g.folder_id = f.id
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM generations';
        let params = [];
        let countParams = [];

        if (folderId === 'null' || folderId === 'unfiled') {
            // Show only unfiled images
            query += ' WHERE g.folder_id IS NULL';
            countQuery += ' WHERE folder_id IS NULL';
        } else if (folderId) {
            if (includeSubfolders) {
                // Show images in this folder and all descendant folders
                const descendantIds = getDescendantFolderIds(db, folderId);
                const allFolderIds = [folderId, ...descendantIds];
                const placeholders = allFolderIds.map(() => '?').join(',');

                query += ` WHERE g.folder_id IN (${placeholders})`;
                countQuery += ` WHERE folder_id IN (${placeholders})`;
                params = [...allFolderIds]; // Create a copy
                countParams = [...allFolderIds]; // Create a separate copy
            } else {
                // Show images only in this specific folder
                query += ' WHERE g.folder_id = ?';
                countQuery += ' WHERE folder_id = ?';
                params = [folderId];
                countParams = [folderId];
            }
        }

        query += ' ORDER BY g.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const images = db.prepare(query).all(...params);

        // Add image URLs and full folder paths
        const imagesWithUrls = images.map(img => ({
            ...img,
            url: getImageUrl(img.folder_id, img.filename),
            folder_path: getFolderPath(db, img.folder_id)
        }));

        const total = db.prepare(countQuery).get(...countParams).total;
        const hasMore = offset + images.length < total;

        return NextResponse.json({
            images: imagesWithUrls,
            total,
            hasMore
        });
    } catch (error) {
        console.error('Error fetching images:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST save new image
export async function POST(request) {
    try {
        const {
            imageData,
            positivePrompt,
            negativePrompt,
            model,
            orientation,
            width,
            height,
            batchSize,
            samplerName,
            scheduler,
            steps,
            cfgScale,
            seed,
            adetailerEnabled,
            adetailerModel,
            info,
            folderId,
            loras
        } = await request.json();

        const db = getDb();
        const id = uuidv4();
        const filename = `${id}.png`;

        // Ensure folder directory exists
        const targetDir = ensureFolderDirectory(folderId || null);
        const filepath = path.join(targetDir, filename);

        // Save image to file
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filepath, base64Data, 'base64');

        // Save to database
        const stmt = db.prepare(`
            INSERT INTO generations (
                id, filename, positive_prompt, negative_prompt, model,
                orientation, width, height, batch_size, sampler_name,
                scheduler, steps, cfg_scale, seed, adetailer_enabled,
                adetailer_model, info_json, folder_id, file_migrated, loras
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            filename,
            positivePrompt,
            negativePrompt,
            model,
            orientation,
            width,
            height,
            batchSize,
            samplerName,
            scheduler,
            steps,
            cfgScale,
            seed,
            adetailerEnabled ? 1 : 0,
            adetailerModel,
            JSON.stringify(info || {}),
            folderId || null,
            1, // Already in correct location
            loras ? JSON.stringify(loras) : null
        );

        const saved = db.prepare(`
            SELECT g.*, f.name as folder_name
            FROM generations g
            LEFT JOIN character_folders f ON g.folder_id = f.id
            WHERE g.id = ?
        `).get(id);

        return NextResponse.json({
            ...saved,
            url: getImageUrl(saved.folder_id, saved.filename),
            folder_path: getFolderPath(db, saved.folder_id)
        });
    } catch (error) {
        console.error('Error saving image:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
