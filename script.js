/* ================================================================
   script.js — All JavaScript logic for the Todo List App

   CONCEPTS USED:
   - Variables (let, const)
   - Arrays and Array methods (.push, .filter, .find)
   - Objects  { id, text, completed }
   - Functions
   - DOM manipulation (querySelector, innerHTML, addEventListener)
   - Template literals (backtick strings)
   - Local Storage (saving data to the browser)
   - JSON.stringify() and JSON.parse()
   ================================================================ */


/* ================================================================
   1. SELECT DOM ELEMENTS
   
   We "grab" HTML elements by their id so JavaScript can work with them.
   Think of these as variables that point to pieces of the webpage.
   ================================================================ */
const taskInput     = document.getElementById("task-input");       // The text field
const addBtn        = document.getElementById("add-btn");          // The "Add" button
const taskList      = document.getElementById("task-list");        // The <ul> task list
const emptyState    = document.getElementById("empty-state");      // "No tasks" message
const totalCount    = document.getElementById("total-count");      // Stat: total
const completedCount= document.getElementById("completed-count");  // Stat: completed
const activeCount   = document.getElementById("active-count");     // Stat: active
const filterBtns    = document.querySelectorAll(".filter-btn");    // All 3 filter buttons


/* ================================================================
   2. APP STATE
   
   "State" = the data our app needs to remember.
   
   tasks[]       — The master list of all tasks. NEVER filtered or modified
                   for display purposes. Always stays as the full list.
   
   currentFilter — Tracks which filter button is active ("all", "active",
                   or "completed"). Starts as "all" so everything shows.
   ================================================================ */
let tasks = [];
let currentFilter = "all";


/* ================================================================
   3. LOCAL STORAGE
   
   LOCAL STORAGE is like a small filing cabinet built into your browser.
   It lets us SAVE data so it survives page refreshes and browser restarts.
   
   Key facts:
   - It stores data as STRINGS (plain text). That's why we need JSON.
   - Each piece of data is stored with a "key" name (like "todoTasks").
   - localStorage.setItem(key, value)  — saves data
   - localStorage.getItem(key)         — retrieves data (or null if not found)
   
   WHY JSON.stringify()?
   Our tasks are an ARRAY OF OBJECTS — JavaScript can't save that directly
   to Local Storage. JSON.stringify() converts it to a string:
   [{ id:1, text:"Buy milk", completed:false }]  →  '[{"id":1,"text":"Buy milk","completed":false}]'
   
   WHY JSON.parse()?
   When we load data back from Local Storage, it's still a string.
   JSON.parse() converts it back into a real JavaScript array/object.
   '[{"id":1,"text":"Buy milk","completed":false}]'  →  [{ id:1, text:"Buy milk", completed:false }]
   ================================================================ */

/* SAVE tasks to Local Storage */
function saveTasks() {
  // JSON.stringify converts the array to a string for storage
  localStorage.setItem("todoTasks", JSON.stringify(tasks));
}

/* LOAD tasks from Local Storage */
function loadTasks() {
  const savedData = localStorage.getItem("todoTasks");

  // getItem returns null if the key doesn't exist (first time visiting)
  if (savedData !== null) {
    // JSON.parse converts the string back into a JavaScript array
    tasks = JSON.parse(savedData);
  }
}


/* ================================================================
   4. GENERATE A UNIQUE ID
   
   Every task needs a unique id so we can identify it precisely.
   Date.now() returns the current timestamp in milliseconds — always unique.
   Example: 1712345678901
   ================================================================ */
function generateId() {
  return Date.now();
}


/* ================================================================
   5. ADD A TASK
   
   Called when the user clicks "Add" or presses Enter.
   Steps:
   1. Read and clean the input value
   2. Guard against empty input
   3. Create a task object
   4. Add it to the tasks array
   5. Save to Local Storage
   6. Clear the input field
   7. Re-render the list
   ================================================================ */
function addTask() {
  // .trim() removes extra spaces from start/end of the string
  const text = taskInput.value.trim();

  // GUARD: Don't add empty tasks — just stop the function early
  if (text === "") {
    // Shake the input to signal the error
    taskInput.classList.add("shake");
    setTimeout(() => taskInput.classList.remove("shake"), 400);
    taskInput.focus();
    return; // "return" stops the function here
  }

  // Create a new task object
  // This is a plain JavaScript object with three properties
  const newTask = {
    id: generateId(),   // Unique number to identify this task
    text: text,         // The task text the user typed
    completed: false    // Starts as not-completed
  };

  // Add the new task to the END of the tasks array
  // .push() adds an item to an array
  tasks.push(newTask);

  // Persist to Local Storage so it survives refresh
  saveTasks();

  // Clear the text input so it's ready for the next task
  taskInput.value = "";
  taskInput.focus(); // Keep focus on the input — good UX

  // Re-draw the task list on screen
  render();
}


/* ================================================================
   6. DELETE A TASK
   
   Called when the user clicks the "×" button on a task.
   
   We use Array.filter() to create a NEW array that excludes
   the task with the matching id.
   
   IMPORTANT: filter() does NOT change the original array.
   It returns a brand-new array. We then assign that new array
   back to tasks, effectively replacing it.
   ================================================================ */
function deleteTask(id) {
  // Keep all tasks EXCEPT the one with this id
  tasks = tasks.filter(function(task) {
    return task.id !== id; // true = keep it, false = remove it
  });

  saveTasks();  // Update Local Storage
  render();     // Refresh the display
}


/* ================================================================
   7. TOGGLE TASK COMPLETION
   
   Called when the user checks/unchecks a task's checkbox.
   
   We use Array.find() to locate the exact task object,
   then flip its "completed" value with the NOT operator (!).
   ================================================================ */
function toggleTask(id) {
  // Array.find() returns the first item that matches the condition
  const task = tasks.find(function(task) {
    return task.id === id;
  });

  // If the task was found, flip its completed status
  if (task) {
    task.completed = !task.completed; // true → false, false → true
  }

  saveTasks();  // Update Local Storage
  render();     // Refresh the display
}


/* ================================================================
   8. RENDER FUNCTION
   
   This is the most important function. It:
   1. Reads the currentFilter variable
   2. Filters the tasks array accordingly (NEVER modifying the original)
   3. Builds the HTML for each visible task
   4. Updates the stat counters
   5. Shows/hides the empty state message
   
   We rebuild the entire list every time something changes.
   This is the simplest pattern — "re-render from scratch."
   
   ── FILTERING EXPLAINED ──────────────────────────────────────────
   
   tasks          = the REAL, complete array. NEVER touched during filtering.
   filteredTasks  = a TEMPORARY array for DISPLAY ONLY. Created fresh each render.
   
   Why keep them separate?
   If we filtered the real tasks array, we'd LOSE tasks permanently!
   Instead, we filter into a new variable, show only those,
   but the real data in tasks stays complete and safe.
   ================================================================ */
function render() {

  /* --- STEP 1: CREATE filteredTasks BASED ON currentFilter --- */

  // Array.filter() takes a function that returns true/false for each item.
  // Items where the function returns true are KEPT in the new array.
  let filteredTasks;

  if (currentFilter === "all") {
    // Show everything — filteredTasks is a copy of all tasks
    filteredTasks = tasks.filter(function() {
      return true; // Always true = always kept
    });

  } else if (currentFilter === "active") {
    // Show only tasks that are NOT completed
    filteredTasks = tasks.filter(function(task) {
      return task.completed === false;
    });

  } else if (currentFilter === "completed") {
    // Show only tasks that ARE completed
    filteredTasks = tasks.filter(function(task) {
      return task.completed === true;
    });
  }


  /* --- STEP 2: BUILD HTML FOR EACH VISIBLE TASK --- */

  // If there are no tasks to show, display the empty state message
  if (filteredTasks.length === 0) {
    taskList.innerHTML = "";           // Clear the list
    emptyState.classList.remove("hidden"); // Show the empty message
  } else {
    emptyState.classList.add("hidden");    // Hide the empty message

    // Build the HTML string for all visible tasks
    // .map() transforms each task object into an HTML string
    // .join("") glues all those strings together (no separator needed)
    taskList.innerHTML = filteredTasks.map(function(task) {

      // Template literals (backtick strings) let us write multi-line HTML
      // and insert variables using ${...}
      return `
        <li class="task-item ${task.completed ? "completed" : ""}" data-id="${task.id}">
          
          <input
            type="checkbox"
            class="task-checkbox"
            ${task.completed ? "checked" : ""}
            onchange="toggleTask(${task.id})"
            aria-label="Mark task complete"
          />
          
          <span class="task-text">${escapeHtml(task.text)}</span>
          
          <button
            class="delete-btn"
            onclick="deleteTask(${task.id})"
            aria-label="Delete task"
            title="Delete task"
          >✕</button>

        </li>
      `;
    }).join("");
  }


  /* --- STEP 3: UPDATE THE STAT COUNTERS --- */

  // We count from the ORIGINAL tasks array (not filtered)
  // so stats always reflect reality, no matter what filter is active
  const total     = tasks.length;
  const completed = tasks.filter(function(t) { return t.completed; }).length;
  const active    = total - completed;

  totalCount.textContent     = total;
  completedCount.textContent = completed;
  activeCount.textContent    = active;
}


/* ================================================================
   9. CHANGE FILTER
   
   Called when the user clicks one of the filter buttons.
   
   Steps:
   1. Update currentFilter to the button's data-filter value
   2. Move the "active-filter" CSS class to the clicked button
   3. Re-render so the task list updates instantly
   ================================================================ */
function changeFilter(selectedFilter) {
  // Update our filter state variable
  currentFilter = selectedFilter;

  // Loop through all filter buttons
  filterBtns.forEach(function(btn) {
    // Remove the highlight class from ALL buttons first
    btn.classList.remove("active-filter");

    // Then add it ONLY to the button that matches the selected filter
    if (btn.dataset.filter === selectedFilter) {
      btn.classList.add("active-filter");
    }
  });

  // Re-render the task list with the new filter applied
  render();
}


/* ================================================================
   10. SECURITY HELPER: escapeHtml()
   
   BEGINNER MISTAKE ALERT: Inserting user text directly into innerHTML
   can allow "XSS" (Cross-Site Scripting) attacks — malicious code.
   
   This function replaces special HTML characters with safe versions
   so user input is always treated as plain text, not code.
   
   Example: "<script>bad()</script>" → "&lt;script&gt;bad()&lt;/script&gt;"
   ================================================================ */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;       // textContent is safe — it auto-escapes
  return div.innerHTML;         // innerHTML now contains the escaped version
}


/* ================================================================
   11. EVENT LISTENERS
   
   Event listeners "listen" for user actions (clicks, key presses, etc.)
   and run a function when they happen.
   ================================================================ */

/* Listen for clicks on the "Add" button */
addBtn.addEventListener("click", addTask);

/* Listen for "Enter" key press inside the text input */
taskInput.addEventListener("keydown", function(event) {
  // event.key tells us which key was pressed
  if (event.key === "Enter") {
    addTask();
  }
});

/* Listen for clicks on each filter button */
filterBtns.forEach(function(btn) {
  btn.addEventListener("click", function() {
    // btn.dataset.filter reads the data-filter="..." attribute from the HTML
    changeFilter(btn.dataset.filter);
  });
});


/* ================================================================
   12. SHAKE ANIMATION (for empty input feedback)
   
   We add a quick shake effect to signal the user forgot to type.
   The CSS @keyframes for "shake" is defined in style.css.
   ================================================================ */

// Add the shake keyframe animation via a <style> tag (keeps it in JS)
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-6px); }
    40%       { transform: translateX(6px); }
    60%       { transform: translateX(-4px); }
    80%       { transform: translateX(4px); }
  }
  .shake {
    animation: shake 0.35s ease;
    border-color: #f43f5e !important;
    box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.15) !important;
  }
`;
document.head.appendChild(shakeStyle);


/* ================================================================
   13. INITIALIZE THE APP
   
   This runs once when the page loads.
   
   Steps:
   1. Load saved tasks from Local Storage
   2. Render them on screen
   
   This is why tasks persist — we load them first, then display them.
   ================================================================ */
loadTasks();   // Step 1: Load from Local Storage
render();      // Step 2: Display them on screen
