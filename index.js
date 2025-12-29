import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import env from "dotenv";

const app = express();
const port = process.env.PORT || 3000;

env.config();

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
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


app.get('/seed-database', async (req, res) => {
    try {
        await db.query(`
            INSERT INTO book (book_name, author, isbn, rating, note) VALUES 
            (
                'Harry Potter and the Philosopher''s Stone', 
                'J.K. Rowling', 
                '9780747532743', 
                5, 
                'Rescued from the outrageous neglect of his aunt and uncle, a young boy with a great destiny proves his worth while attending Hogwarts School of Witchcraft and Wizardry. Harry discovers a world of magic, makes best friends with Ron and Hermione, and faces the dark wizard Voldemort who killed his parents. A classic tale of good versus evil that introduces the Wizarding World.'
            ),
            (
                'The Hobbit', 
                'J.R.R. Tolkien', 
                '9780547928227', 
                5, 
                'Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life, rarely traveling further than the pantry of his hobbit-hole in Bag End. But his contentment is disturbed when the wizard Gandalf and a company of thirteen dwarves arrive on his doorstep one day to whisk him away on an unexpected journey "there and back again." They plot to raid the treasure hoard of Smaug the Magnificent, a large and very dangerous dragon.'
            ),
            (
                '1984', 
                'George Orwell', 
                '9780451524935', 
                4, 
                'Among the seminal texts of the 20th century, Nineteen Eighty-Four is a rare work that grows more haunting as its futuristic purgatory becomes more real. Published in 1949, the book offers political satirist George Orwell''s nightmarish vision of a totalitarian, bureaucratic world and one poor stiff''s attempt to find individuality. The brilliance of the novel is Orwell''s prescience about modern life—the ubiquity of television, the distortion of the language—and his ability to construct such a thorough version of hell.'
            ),
            (
                'The Great Gatsby', 
                'F. Scott Fitzgerald', 
                '9780743273565', 
                3, 
                'The Great Gatsby, F. Scott Fitzgerald''s third book, stands as the supreme achievement of his career. This exemplary novel of the Jazz Age has been acclaimed by generations of readers. The story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan, of lavish parties on Long Island at a time when The New York Times noted "gin was the national drink and sex the national obsession," it is an exquisitely crafted tale of America in the 1920s.'
            ),
            (
                'Atomic Habits', 
                'James Clear', 
                '9780735211292', 
                5, 
                'No matter your goals, Atomic Habits offers a proven framework for improving--every day. James Clear, one of the world''s leading experts on habit formation, reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results. If you''re having trouble changing your habits, the problem isn''t you. The problem is your system.'
            );
        `);
        res.send("✅ Success! 5 Books with Summaries Added.");
    } catch (err) {
        console.error(err);
        res.send("❌ Error: " + err.message);
    }
});

app.listen(port, ()=>{
    console.log('running on port 3000')
})