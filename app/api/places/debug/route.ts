import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const towns = await db.collection('towns').find({}).limit(2).toArray();

    const debugInfo = towns.map((town) => ({
      _id: town._id?.toString(),
      name: town.name,
      allKeys: Object.keys(town),
      placesField: town.places ? {
        type: Array.isArray(town.places) ? 'array' : typeof town.places,
        length: Array.isArray(town.places) ? town.places.length : 'N/A',
        firstPlace: Array.isArray(town.places) && town.places.length > 0 
          ? {
              keys: Object.keys(town.places[0]),
              sample: {
                id: town.places[0].id,
                name: town.places[0].name,
                lat: town.places[0].lat,
                lon: town.places[0].lon,
                category: town.places[0].category,
                hasTags: !!town.places[0].tags,
                tagsKeys: town.places[0].tags ? Object.keys(town.places[0].tags) : [],
              }
            }
          : null,
      } : 'No places field',
    }));

    return NextResponse.json({
      townsCount: towns.length,
      debug: debugInfo,
    });
  } catch (error) {
    console.error('[API /places/debug] error', error);
    return NextResponse.json({ 
      error: 'Unable to debug', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

