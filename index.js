import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = process.env.PORT || 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "book",
  password: "Jacob@35",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get('/', async (req,res)=>{
    let result = db.query('SELECT * FROM book')
    let data = (await result).rows
    res.render('index.ejs', {data:data})
})

app.get('/books', async (req, res) => {
  try {
    // FIX 1: Use req.query for GET requests
    let sort = req.query.sortType; 
    let result;
    console.log(sort)

    switch (sort) {
      case 'rating':
        result = await db.query('SELECT * FROM book ORDER BY rating DESC'); // Usually users want Highest first
        break;
      case 'date':
        result = await db.query('SELECT * FROM book ORDER BY id DESC'); // Assuming ID implies date, or use a date column
        break;
      case 'title':
        // FIX 2: Do NOT write 'let' again. It creates a temporary variable that disappears.
        result = await db.query('SELECT * FROM book ORDER BY book_name ASC'); 
        break;
      default:
        // FIX 3: You need a fallback! If sort is undefined (first load), fetch normal list.
        result = await db.query('SELECT * FROM book');
        break;
    }
    

    // Extract rows from the database result
    let data = result.rows; 
    
    res.render('index.ejs', { data: data , type:sort});

  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

app.get('/create', async (req,res)=>{
  res.render('create.ejs')
})

app.post('/new', async (req,res)=>{
  let title = req.body.title
  let author = req.body.author
  let isb = req.body.isbn
  let isbn = isb.trim()
  let note = req.body.note
  let rating = req.body.rating
  try {
    await db.query('INSERT INTO book (book_name, author, note, rating, isbn) VALUES ($1,$2,$3,$4,$5)',[title,author,note,rating,isbn])
    res.redirect('/')
  } catch (error) {
    console.log(error)
    res.redirect('/')
  } 
})

app.get('/view/:id', async(req,res)=>{
  let result = db.query('SELECT * FROM book')
  let data = (await result).rows
  const bookId = parseInt(req.params.id); 
  const book = data.find(p=> p.id === bookId)
  res.render('view.ejs',{book:book})
})

app.get('/view/delete/:id', async (req,res)=>{
  const bookId = parseInt(req.params.id); 
  try {
   await db.query('DELETE FROM book WHERE id = ($1)',[bookId])
   res.redirect('/') 
  } catch (error) {
    console.log(error)
    res.redirect('/')
  }

})

app.get('/view/update/:id', async(req,res)=>{
  let result = db.query('SELECT * FROM book')
  let data = (await result).rows
  const bookId = parseInt(req.params.id); 
  const book = data.find(p=> p.id === bookId)
  res.render('update.ejs',{book:book})
})

app.post('/update', async (req,res)=>{
  let title = req.body.title
  let author = req.body.author
  let isb = req.body.isbn
  let isbn = isb.trim()
  let note = req.body.note
  let rating = req.body.rating
  let id  = req.body.id
  try {
    await db.query('UPDATE book SET book_name = ($1), author = ($2), note = ($3), rating = ($4), isbn = ($5) WHERE id =($6)',[title,author,note,rating,isbn,id])
    res.redirect('/')
  } catch (error) {
    console.log(error)
    res.redirect('/')
  } 
})


app.listen(port, ()=>{
    console.log('running on port 3000')
})