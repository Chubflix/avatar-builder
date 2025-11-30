import {HttpError} from "@/app/errors/HttpError";

export default class NotFound extends HttpError {
    constructor(message: string = 'Not found') {
        super(message, 404);
    }
}