process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../app");
const db = require("../db");
const Book = require("../models/book");
const ExpressError = require("../expressError");

let test_isbn;

beforeEach(async function () {
    let res = await db.query(`
        INSERT INTO
            books (isbn, amazon_url, author, language, pages, publisher, title, year)
            VALUES (
                '012345678', 
                'www.testbook.com', 
                'Dr. Testy', 
                'english', 
                100, 
                'The Test Co.', 
                'Testing This', 
                2023)
            RETURNING isbn`);

    test_isbn = res.rows[0].isbn
});

/** GET */

describe("GET /books", function () {
    test("Gets 1 book", async function () {
        const res = await request(app).get(`/books`);
        const books = res.body.books;
        expect(books).toHaveLength(1);
        expect(books[0]).toHaveProperty('isbn');
        expect(books[0].language).toEqual('english');
        expect(books[0].isbn).toEqual('012345678');
        expect(books[0].amazon_url).toEqual('www.testbook.com');
    });
});

describe("GET /books/:isbn", function () {
    test("Gets 1 book by isbn", async function () {
        const res = await request(app)
            .get(`/books/${test_isbn}`);
        const { book } = res.body
        expect(book).toHaveProperty('isbn');
        expect(book.isbn).toEqual('012345678')
    });
    test("Gets 1 book by isbn", async function () {
        const res = await request(app)
            .get(`/books/00000099`)
        expect(res.statusCode).toBe(404);
    });
});


/** POST  */

describe("POST /books", function () {
    test("can create book", async function () {
        let response = await request(app)
            .post("/books")
            .send({
                isbn: "0000111000",
                amazon_url: "www.test1book.com",
                author: "Dr. 2 Testy",
                language: "english",
                pages: 200,
                publisher: "The 2nd Test Co.",
                title: " 2Testing This",
                year: 2022,
            });
        expect(response.statusCode).toBe(201);
        expect(response.body.book).toHaveProperty("isbn");
    });
    test("prevents book creation if data missing", async function () {
        let res = await request(app)
            .post('/books')
            .send({
                publisher: "The 3rd Test",
                title: "Should Fail",
                year: 2029,
            });
        expect(res.statusCode).toBe(400);
    })
});

describe("DELETE /books/:isbn", () => {
    test("deletes book by isbn", async function () {
        const res = await request(app)
            .delete(`/books/${test_isbn}`)
        expect(res.body).toEqual({ message: "Book deleted" })
    })
})

describe("PUT /books/:isbn", () => {
    test("updates book by isbn", async function () {
        const res = await request(app)
            .put(`/books/${test_isbn}`)
            .send({
                amazon_url: "www.updated.com",
                author: "Updated Author",
                language: "Lang Updated",
                publisher: "Pub Updated"
            });
        expect(res.body.book).toHaveProperty('isbn');
        expect(res.body.book.author).toBe("Updated Author");
        expect(res.body.book.language).toBe("Lang Updated");
        expect(res.body.book.publisher).toBe("Pub Updated");
        expect(res.body.book.amazon_url).toBe("www.updated.com");
    });
    test("update failure for missing data", async () =>{
        const res = await request(app)
            .put(`/books/${test_isbn}`)
            .send({
                author: "Updated Author",
                language: "Lang Updated",
                publisher: "Pub Updated"
            });
        expect(res.statusCode).toBe(400);
    })
})



afterEach(async function () {
    await db.query("DELETE FROM books");
});

afterAll(async function () {
    await db.end();
});
