import {HttpError} from "@/app/errors/HttpError";

export default class Unauthorized extends HttpError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401);
    }
}