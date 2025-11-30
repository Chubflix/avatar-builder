import {HttpError} from "@/app/errors/HttpError";

export default class BadRequest extends HttpError {
    constructor(message: string = 'Bad request') {
        super(message, 400);
    }
}