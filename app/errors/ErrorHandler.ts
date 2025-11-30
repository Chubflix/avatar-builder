import {HttpError} from "@/app/errors/HttpError";
import {NextResponse} from "next/server";

export function handleError(error: Error): NextResponse<{error: string}> {
    if (error instanceof HttpError) {
        return NextResponse.json(
            { error: error.message },
            { status: error.statusCode }
        )
    }

    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
    )
}