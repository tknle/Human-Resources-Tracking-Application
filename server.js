/*********************************************************************************
* WEB322 – Assignment 06
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part
* of this assignment has been copied manually or electronically from any other source
* (including 3rd party web sites) or distributed to other students.
*
* Name: Mia LE Student ID: 131101198 Date: Nov 29, 2020
*
* Online (Heroku) Link: https://ancient-caverns-45569.herokuapp.com/
*
********************************************************************************/ 
const HTTP_PORT = process.env.PORT || 8080;
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const dataService = require(__dirname + "/data-service.js");
const exphbs = require('express-handlebars');
const dataServiceAuth = require(__dirname + "/data-service-auth.js");
const clientSessions = require('client-sessions');

//multer
const storage = multer.diskStorage({
    destination: "./public/images/uploaded",
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
      }
});

const upload = multer({storage: storage});


//express-handlebars
app.engine('.hbs', exphbs({ 
    extname: ".hbs", 
    defaultLayout: "main",
    helpers: {
        navLink: function(url, options){
            return '<li' + 
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') + '><a href="' + url + '">' + options.fn(this) + '</a></li>'; },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        }           
    } 
}));


////////////////////////////////////////////////
//                 ENSURE LOGIN               //
////////////////////////////////////////////////


//Active settings
app.use(function(req,res,next) {
    let route = req.baseUrl+req.path;
    app.locals.activeRoute = (route == "/") ? "/":route.replace(/\/$/,"");
    next();
});

app.use(clientSessions( {
    cookieName: "session",
    secret: "web_week10_secret",
    duration: 2*60*1000,
    activeDuration: 1000*60
}));

app.use((req,res,next) => {
    res.locals.session = req.session;
    next();
});

ensureLogin = (req,res,next) => {
    if (!(req.session.user)) {
        res.redirect("/login");
    }
    else { next(); }
};

app.set('view engine', '.hbs');

onHttpStart = () => {
    console.log('Express http server listening on port ' + HTTP_PORT);
}


//set up body-parser
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));


////////////////////////////////////////////////
//                  ROUTES                    //
////////////////////////////////////////////////

//home
app.get('/', (req, res) => {
    res.render('home');
});

//about
app.get('/about', (req, res) => {
    res.render('about');
});

////////////////////////////////////////////////
//              AN EMPLOYEE                   //
////////////////////////////////////////////////

//GET employees
app.get("/employees", ensureLogin, (req, res) => {
    if (req.query.status) {
        dataService.getEmployeeByStatus(req.query.status)
        .then((data) => {
            if(data.length>0)
            res.render("employees", { employees: data = data.map(value => value.dataValues) })
            else res.render("employees",{message: "no results"})
        })
        .catch((err) => {
            res.render("employees",{message: "no results"})
        })
    }
    else if (req.query.department) {
        dataService.getEmployeesByDepartment(req.query.department)
        .then((data) => {
            if(data.length>0)
            res.render("employees", { employees: data = data.map(value => value.dataValues) })
            else res.render("employees",{message: "no results"})
        })
        .catch((err) => {
            res.render("employees",{message: "no results"})
        })
    }
    else if (req.query.manager) {
        dataService.getEmployeesByManager(req.query.manager)
        .then((data) => {
            if(data.length>0)
            res.render("employees", { employees: data = data.map(value => value.dataValues) })
            else res.render("employees",{message: "no results"})
        })
        .catch(() => res.render("employees",{message: "no results"}))
    }
    else {
        dataService.getAllEmployees()
        .then((data) => {
            if(data.length>0)
            res.render("employees", { employees: data = data.map(value => value.dataValues)})
            else res.render("employees",{message: "no results"})
        })
        .catch(() => res.render("employees",{message: "no results"}))
    }
});

app.get("/employee/:empNum", ensureLogin,(req, res) => {

    // initialize an empty object to store the values
    let viewData = {};

    dataService.getEmployeeByNum(req.params.empNum).then((data) => {
       
        if (data) {
             //SOLVE PROBLEM WITH UPDATE
             data = data.map(value => value.dataValues);
            viewData.employee = data; //store employee data in the "viewData" object as "employee"
        } else {
            viewData.employee = null; // set employee to null if none were returned
        }
    }).catch(() => {
        viewData.employee = null; // set employee to null if there was an error 
    }).then(dataService.getDepartments)
    .then((data) => {
        //SOLVE PROBLEM WITH UPDATE
          data = data.map(value => value.dataValues);
        viewData.departments = data; // store department data in the "viewData" object as "departments"

        // loop through viewData.departments and once we have found the departmentId that matches
        // the employee's "department" value, add a "selected" property to the matching 
        // viewData.departments object

        for (let i = 0; i < viewData.departments.length; i++) {
            if (viewData.departments[i].departmentId == viewData.employee.department) {
                viewData.departments[i].selected = true;
            }
        }

    }).catch(() => {
        viewData.departments = []; // set departments to empty if there was an error
    }).then(() => {
        if (viewData.employee == null) { // if no employee - return an error
            res.status(404).send("Employee Not Found");
        } else {
            res.render("employee", { viewData: viewData }); // render the "employee" view
        }
    });
});


//add employees: GET
app.get('/employees/add', ensureLogin, (req,res) => {
    dataService.getDepartments()
    .then((data) => {
        res.render("addEmployee", { departments: data = data.map(value => value.dataValues)})
    })
    .catch((err) => {
        res.render("addEmployee", { departments: [] } )
    });
});


//add employees: POST
app.post('/employees/add',ensureLogin, (req,res) => {
    dataService.addEmployee(req.body)
    .then(res.redirect("/employees"))
    .catch((err) => res.json({"message": err}))   
});


//Update employees: POST
app.post('/employee/update', ensureLogin,(req, res) => {
    dataService.updateEmployee(req.body).then(() => {
        res.redirect("/employees");
    })
});

//delete by empNum
app.get('/employees/delete/:empNum', ensureLogin, (req,res) => {
    dataService.deleteEmployeeByNum(req.params.empNum)
    .then(res.redirect("/employees"))
    .catch(err => res.status(500).send("Unable to Remove Employee / Employee not found"))
});

////////////////////////////////////////////////
//                   IMAGE                    //
////////////////////////////////////////////////
//images
app.get('/images/add', ensureLogin, (req,res) => {
    res.render(path.join(__dirname + "/views/addImage.hbs"));
});

app.post("/images/add", upload.single("imageFile"), (req,res) => {
    res.redirect("/images");
});

app.get("/images", (req,res) => {
    fs.readdir("./public/images/uploaded", function(err,items) {
        res.render("images", { data: items });
    })
});


////////////////////////////////////////////////
//                  MANAGERS                  //
////////////////////////////////////////////////

//managers
app.get("/managers", ensureLogin, (req, res) => {
    dataService.getManagers()
    .then(data => res.render("employees", {employees: data = data.map(value => value.dataValues)}))
    .catch(err => res.status(404).send("managers data not found"))
});


////////////////////////////////////////////////
//             DEPARTMENT ROUTES              //
////////////////////////////////////////////////

//departments
app.get("/departments", ensureLogin, (req, res) => {
    dataService.getDepartments()
    .then((data) => {
        if(data.length>0) 
        res.render("departments", { departments: data = data.map(value => value.dataValues) });
        else 
        res.render("departments",{message: "no results"})
    })
    .catch(err => res.status(404).send('departments not found'))
});

//add departments: GET
app.get("/departments/add", ensureLogin, (req,res) => {
    res.render("addDepartment");
});

//add departments: POST
app.post("/departments/add", ensureLogin, (req,res) => {
    dataService.addDepartment(req.body)
    .then(() => {
        res.redirect("/departments");
    })
    .catch((err) => res.json({"message": err}))
});


//Update departments: POST
app.post("/department/update", ensureLogin, (req,res) => {
    dataService.updateDepartment(req.body)
    .then(() => {
        res.redirect("/departments");
    }).catch((err) => {
        res.render("/departments",{message : "no results"});
    });
});

//departments by id
//The prob comes from HERE, data map
app.get("/department/:departmentId", ensureLogin, (req, res) =>{
    dataService.getDepartmentById(req.params.departmentId)
    .then((data) => {
        if(data.length>0)
        res.render("department", { department: data = data.map(value => value.dataValues) })
        else 
        res.status(404).send("Department Not Found"); 
    }).catch((err) => {
        res.status(404).send("department not found");
    })
});

////delete by department number
app.get('/departments/delete/:id', ensureLogin, (req,res) => {
    dataService.deleteDepartmentByNum(req.params.id)
    .then(res.redirect("/departments"))
    .catch(err => res.status(500).send("Unable to Remove Department / Department not found"))
});

////////////////////////////////////////////////
//                  LOGIN                   //
////////////////////////////////////////////////

//GET /login

app.get("/login", (req,res) => {
    res.render("login");
});

//GET /register
app.get("/register", (req,res) => {
    res.render("register");
});

//POST /register
app.post("/register", (req,res) => {
    dataServiceAuth.registerUser(req.body)
    .then(() => res.render("register", {successMessage: "User created" } ))
    .catch (err => res.render("register", {errorMessage: err, userName:req.body.userName }) )
});

//POST /login
app.post("/login", (req,res) => {
    req.body.userAgent = req.get('User-Agent');
    dataServiceAuth.checkUser(req.body)
    .then(user => {
        req.session.user = {
            userName:user.userName,
            email:user.email,
            loginHistory:user.loginHistory
        }
        res.redirect("/employees");
    })
    .catch(err => {
        res.render("login", {errorMessage:err, userName:req.body.userName} )
    }) 
});

//GET /logout
app.get("/logout", (req,res) => {
    req.session.reset();
    res.redirect("/login");
});

//GET /userHistory
app.get("/userHistory", ensureLogin, (req,res) => {
    res.render("userHistory", {user:req.session.user} );
});


////////////////////////////////////////////////
//                  SERVER                    //
////////////////////////////////////////////////
//Errora
app.use((req, res) => {
    res.status(404).end('404 PAGE NOT FOUND');
});

dataService.initialize()
.then(dataServiceAuth.initialize)
.then(function(){
 app.listen(HTTP_PORT, function(){
 console.log("app listening on: " + HTTP_PORT)
 });
}).catch(function(err){
    console.log("unable to start server: " + err);
});