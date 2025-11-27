import { NextResponse } from 'next/server'
import { saveShare } from '@/app/lib/db'
import { randomUUID } from 'crypto'

export async function POST(request) {
    try {
        const state = await request.json()
        const token = randomUUID()
        saveShare(token, state)
        
        return NextResponse.json({ token })
    } catch (error) {
        console.error('Error saving share:', error)
        return NextResponse.json({ error: 'Failed to save share' }, { status: 500 })
    }
}

