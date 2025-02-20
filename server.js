  const http = require("http");
  const mysql = require("mysql2");
  const url = require("url");
  const { dbConfig } = require("./config/config");
  const strings = require("./lang/en/strings");

  class DatabaseManager {
    constructor(config) {
      this.connection = mysql.createConnection(config);
      this.connection.connect((err) => {
        if (err) throw err;
        console.log(strings.mysqlConnectionSuccess);
        this.createPatientTable();
      });

      //comment
    }

    createPatientTable() {
      const createTableQuery = `CREATE TABLE IF NOT EXISTS patient (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        birth_date DATE NOT NULL
      ) ENGINE=InnoDB;`;

      this.connection.query(createTableQuery, (err) => {
        if (err) throw err;
        console.log(strings.patientTableReady);
      });
    }

    insertData(data, callback) {
      const checkTableQuery = "SHOW TABLES LIKE 'patient'";
    
      this.connection.query(checkTableQuery, (err, result) => {
        if (err) return callback(err, null);
    
        if (result.length === 0) {
          this.createPatientTable();
        }
    
        const sql = "INSERT INTO patient (name, birth_date) VALUES ?";
        this.connection.query(sql, [data], (err, result) => {
          callback(err, result);
        });
      });
    }
    

    executeQuery(query, callback) {
      this.connection.query(query, (err, result) => {
        callback(err, result);
      });
    }
  }

  class RequestHandler {
    constructor(databaseManager) {
      this.databaseManager = databaseManager;
    }

    handleRequest(req, res) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS"); 
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      ); 

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        return res.end();
      }

      if (req.method === "POST" && req.url === "/insert") {
        this.handleInsert(req, res);
      } else if (req.method === "GET" && req.url.startsWith("/query")) {
        this.handleQuery(req, res);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ [strings.error]: strings.invalidRequest }));
      }
    }

    handleInsert(req, res) {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        try {
          const parsedBody = JSON.parse(body);

          if (parsedBody.query) {
            if (!parsedBody.query.toUpperCase().startsWith("INSERT")) {
              res.writeHead(400);
              return res.end(
                JSON.stringify({ error: "Only INSERT queries allowed" })
              );
            }

            this.databaseManager.executeQuery(parsedBody.query, (err, result) => {
              if (err) {
                res.writeHead(500);
                return res.end(JSON.stringify({ error: err.message }));
              }
              res.end(
                JSON.stringify({ success: true, inserted: result.affectedRows })
              );
            });
          } else if (Array.isArray(parsedBody.data)) {
            this.databaseManager.insertData(parsedBody.data, (err, result) => {
              if (err) {
                res.writeHead(500);
                return res.end(JSON.stringify({ error: err.message }));
              }
              res.end(
                JSON.stringify({ success: true, inserted: result.affectedRows })
              );
            });
          } else {
            res.writeHead(400);
            res.end(JSON.stringify({ error: "Invalid request format" }));
          }
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ [strings.error]: strings.invalidJson }));
        }
      });
    }

    handleQuery(req, res) {
      const queryObject = url.parse(req.url, true).query;
      const sql = queryObject.sql;

      if (!sql || (!sql.toUpperCase().startsWith("SELECT") && !sql.toUpperCase().startsWith("INSERT"))) {
        res.writeHead(400);
        return res.end(JSON.stringify({ [strings.error]: strings.onlySelectInsertAllowed }));
      }

      this.databaseManager.executeQuery(sql, (err, result) => {
        if (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ [strings.error]: err.message }));
        } else {
          res.end(JSON.stringify(result));
        }
      });
    }
  }

  class Server {
    constructor(port, requestHandler) {
      this.port = port;
      this.requestHandler = requestHandler;
    }

    start() {
      const server = http.createServer((req, res) => {
        this.requestHandler.handleRequest(req, res);
      });

      server.listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);
      });
    }
  }


  const databaseManager = new DatabaseManager(dbConfig); 
  const requestHandler = new RequestHandler(databaseManager);
  const server = new Server(3000, requestHandler);

  server.start();
