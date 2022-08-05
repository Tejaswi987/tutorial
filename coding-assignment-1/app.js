const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dateformat = require("date-fns/format");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

//let resultDate = dateformat(new Date(2020, 2, 8), "yyyy-MM-dd");
//console.log(resultDate);

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertToDbObject = (data) => {
  return {
    id: data.id,
    todo: data.todo,
    priority: data.priority,
    status: data.status,
    category: data.category,
    dueDate: data.due_date,
  };
};
const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasPriorityAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      data = await database.all(getTodosQuery);
      if (data.length === 0) {
        response.status(400);
        response.send("Invalid Todo Status");
      }

      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      data = await database.all(getTodosQuery);
      if (data.length === 0) {
        response.status(400);
        response.send("Invalid Todo Priority");
      }

      break;
    case hasPriorityAndStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      data = await database.all(getTodosQuery);

      break;
    case hasCategoryAndStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}';`;
      data = await database.all(getTodosQuery);
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      data = await database.all(getTodosQuery);
      if (data.length === 0) {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasCategoryAndPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND priority = '${priority}';`;
      data = await database.all(getTodosQuery);
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
      data = await database.all(getTodosQuery);
  }

  if (data.length !== 0) {
    response.send(data.map((eachObj) => convertToDbObject(eachObj)));
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(convertToDbObject(todo));
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  let error_status = 0;
  try {
    let d = new Date(dueDate);
    let resultDate = dateformat(
      new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      "yyyy-MM-dd"
    );

    if (status !== `TO DO` && status !== `IN PROGRESS` && status !== `DONE`) {
      error_status = 1;
      response.status(400);
      response.send("Invalid Todo Status");
    }
    if (category !== `WORK` && category !== `HOME` && category !== `LEARNING`) {
      error_status = 1;
      response.status(400);
      response.send("Invalid Todo Category");
    }
    if (priority !== `HIGH` && priority !== `MEDIUM` && priority !== `LOW`) {
      error_status = 1;
      response.status(400);
      response.send("Invalid Todo Priority");
    }

    if (error_status !== 1) {
      const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status,category,due_date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}', '${category}','${resultDate}');`;
      await database.run(postTodoQuery);
      response.send("Todo Successfully Added");
    }
  } catch (error) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  try {
    let d = new Date(date);

    let resultDate = dateformat(
      new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      "yyyy-MM-dd"
    );
    const getTodoQuery = `
  SELECT * FROM todo WHERE due_date='${resultDate}';`;

    const todo = await database.all(getTodoQuery);
    if (todo.length === 0) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      response.send(todo.map((eachObj) => convertToDbObject(eachObj)));
    }
  } catch (error) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let error_status = 0;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }

  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  //const { todo, priority, status, category, dueDate } = request.body;
  if (
    //status.length !== 0 &&
    status !== `TO DO` &&
    status !== `IN PROGRESS` &&
    status !== `DONE`
  ) {
    error_status = 1;
    response.status(400);
    response.send("Invalid Todo Status");
  }
  if (
    //category.length !== 0 &&
    category !== `WORK` &&
    category !== `HOME` &&
    category !== `LEARNING`
  ) {
    error_status = 1;
    response.status(400);
    response.send("Invalid Todo Category");
  }
  if (
    //priority.length !== 0 &&
    priority !== `HIGH` &&
    priority !== `MEDIUM` &&
    priority !== `LOW`
  ) {
    error_status = 1;
    response.status(400);
    response.send("Invalid Todo Priority");
  }
  if (error_status !== 1) {
    try {
      let d = new Date(dueDate);

      let resultDate = dateformat(
        new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        "yyyy-MM-dd"
      );
      const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category = '${category}',
      due_date = '${resultDate}'
    WHERE
      id = ${todoId};`;

      await database.run(updateTodoQuery);
      response.send(`${updateColumn} Updated`);
    } catch (error) {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
