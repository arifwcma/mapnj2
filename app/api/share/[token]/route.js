import { NextResponse } from 'next/server'
import { getShare } from '@/app/lib/db'

export async function GET(request, { params }) {
    try {
        const resolvedParams = await params
        const { token } = resolvedParams
        const state = getShare(token)
        
        if (!state) {
            return NextResponse.json({ error: 'Share not found' }, { status: 404 })
        }
        
        return NextResponse.json({ state })
    } catch (error) {
        console.error('Error loading share:', error)
        return NextResponse.json({ error: 'Failed to load share' }, { status: 500 })
    }
}

