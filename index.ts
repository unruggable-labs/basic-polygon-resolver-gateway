import express from 'express'
import serverAdapter from './server-adapter'

const app = express()

// Bind our adapter to `/mypath` endpoint
app.use('/', serverAdapter)

app.listen(4000, () => {
  console.log('Running the server at http://localhost:4000/')
})