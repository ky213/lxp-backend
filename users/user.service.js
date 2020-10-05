const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const bcrypt = require('bcrypt');
const knex = require('../db'); 

module.exports = {
    authenticate,
    getAll,
    getAllUsers,
    getByEmployeeId,
    getByUserId,
    updateProfilePhoto,
    checkIfEmailExists,
    changePassword,
    deleteEmployees,
    updateProfileData,
    updateBulk,
};

async function authenticate({ email, password }) {

    const user = await knex('users')
        .where('users.email', email.toLowerCase())
        .select(['users.user_id',
            'user_id as userId',
            'email',
            'name', 
            'name as firstName',
            'surname as lastName', 
            'is_super_admin',
            'password',
            'profile_photo as profilePhoto'            
            ]
        )
        .first();
    console.log("Got user:", user)
    if (user)
    {
        const passIsValid = await bcrypt.compare(password, user.password);
        if (passIsValid)
        {
            if (user.profilePhoto) {
                user.profilePhoto = Buffer.from(user.profilePhoto).toString();
            }

            if(user.firstName && user.lastName) {
                user.fullName = `${user.firstName} ${user.lastName}`;
            }

            if(user.is_super_admin) {
                // necu mijenjati sub s user_id pa sam dodao userId
                const token = jwt.sign({ sub: user.user_id, userId: user.user_id, role: Role.SuperAdmin
                }, config.secret);

                user.role = 'SuperAdmin';
                user.roleDescription = 'Super Admin';
    
                const { password, is_super_admin, ...userWithoutPassword } = user;
                //const { password, ...userWithoutPassword } = user; // we shouldnt need super admin flag
                return {user: userWithoutPassword, token};
            }
            else
            {
                const [employee] = await knex('users')
                    .join('employees', 'employees.user_id', 'users.user_id')
                    .join('organizations', 'organizations.organization_id', 'employees.organization_id')
                    .leftJoin('employee_roles', 'employee_roles.employee_id', 'employees.employee_id')
                    .leftJoin('roles', 'roles.role_id', 'employee_roles.role_id')                    
                    .leftJoin('employee_programs', 'employee_programs.employee_id', 'employees.employee_id')
                    .leftJoin('program_directors', 'program_directors.employee_id', 'employees.employee_id')
                .where('employees.user_id', user.userId)
                    .andWhere('organizations.is_active', true)
                .limit(1)
                .select(['users.user_id',
                    'users.user_id as userId', 'employees.employee_id as employeeId', 'email', 'users.name', 
                    'users.name as firstName', 'surname as lastName', 
                    'is_super_admin', 'password', 
                    'users.profile_photo as profilePhoto',
                    'employees.organization_id as organizationId', 'organizations.name as organizationName', 'roles.role_id as role', 
                    'roles.name as roleDescription', 'organizations.color_code as organizationForegroundColor',
                    'organizations.background_color_code as organizationBackgroundColor', 'employee_programs.program_id as programId',
                    'program_directors.program_id as directorProgramId', 'employees.exp_level_id as experienceLevelId',
                    'organizations.logo as organizationLogo']
                );

                if(!employee.programId) {
                    employee.programId = user.directorProgramId;
                }

                if(employee.firstName && employee.lastName) {
                    employee.fullName = `${user.firstName} ${user.lastName}`;
                }                

                // necu mijenjati sub s user_id pa sam dodao userId
                const token = jwt.sign({ sub: user.user_id, userId: user.user_id, employeeId: employee.employeeId, role: employee.role, 
                    organization: employee.organizationId, programId: employee.programId, experienceLevelId: employee.experienceLevelId
                }, config.secret);
    
                const { password, is_super_admin, directorProgramId, ...userWithoutPassword } = employee;
                //const { password, ...userWithoutPassword } = user; // we shouldnt need super admin flag
                return {user: userWithoutPassword, token};
            }            
        }
    }
}

// user administration screens
async function getAll(user, pageId, recordsPerPage, filterName, isLearner, includeInactive, organizationId, filterProgramId) {
    let offset = (pageId - 1) * recordsPerPage;

    organizationId = (user.role == Role.SuperAdmin && organizationId) ? organizationId : user.organization;

    console.log('getAll', user, organizationId);

    var model = knex.table('employees')
        .innerJoin('users','users.user_id','employees.user_id')
        .innerJoin('organizations', 'organizations.organization_id', 'employees.organization_id')
        .leftJoin('employee_roles', 'employee_roles.employee_id', 'employees.employee_id')
        .leftJoin('roles', 'roles.role_id', 'employee_roles.role_id')
        .leftJoin('experience_levels', 'experience_levels.exp_level_id', 'employees.exp_level_id')
        .leftJoin('employee_programs', 'employee_programs.employee_id', 'employees.employee_id')
        .leftJoin('programs', 'programs.program_id', 'employee_programs.program_id')

    model.where('employees.organization_id', organizationId);
    model.andWhere('users.is_super_admin', 0);

    if (user.role != Role.SuperAdmin)
        model.where('employees.employee_id', "<>", user.employeeId);

    if (!includeInactive) {
        model.andWhere('employees.is_active', true);
    }        

    if (isLearner != null) {
        model.andWhere('employees.is_learner', isLearner);
        if(isLearner && filterProgramId) {
            model.whereIn('employees.employee_id', function() {
                this.select('employee_id').from('employee_programs').where('program_id', filterProgramId);
            });
        }
    }

    if (filterName)
    {        
        filterName = filterName.toLowerCase();
        model.andWhere(function() {
            this.whereRaw(`lower(users.name) || ' ' || lower(users.surname) like ?`, [`%${filterName.toLowerCase().trim()}%`])
            this.orWhereRaw(`lower(users.surname) || ' ' || lower(users.name) like ?`, [`%${filterName.toLowerCase().trim()}%`])
        });
    }    

    var totalNumberOfRecords = await model.clone().count();

    if (totalNumberOfRecords[0].count <= offset)
        offset = 0;

    var users = await model.clone()
        .orderBy('employees.is_active', 'desc')
        .orderBy('surname', 'asc')
        .offset(offset)
        .limit(recordsPerPage)
        .select([
            'users.user_id as userId',
            'users.email', 
            'users.name',
            'users.surname',
            'users.gender',
            'users.start_date as startDate',
            'users.profile_photo as profilePhoto',       
            'employees.employee_id as employeeId',
            'employees.is_active as isActive',
            'employees.exp_level_id as expLevelId',
            'employees.organization_id as organizationId',
            'organizations.name as organizationName',
            'roles.role_id as role',
            'roles.name as roleName',
            'experience_levels.name as expLevelName',
            'programs.name as programName',
            'programs.program_id as programId'
        ]);
    
        const allUserGroups =
        await knex.table('groups_employee')
            .join('employees', 'employees.employee_id', 'groups_employee.employee_id')
            .join('groups', 'groups.group_id', 'groups_employee.group_id')
            .whereIn('employees.user_id', users.map(u => u.userId))
            .select([
                'groups.group_id as groupId',
                'groups.name as name',
                'employees.user_id as userId'
            ]);                               

        const allUserCourses =
            await knex.table('user_courses')
                .join('courses', 'courses.course_id', 'user_courses.course_id')
                .whereIn('user_courses.user_id', users.map(u => u.userId))
                .select([
                    'user_courses.course_id as courseId',
                    'courses.name as name',
                    'user_courses.joining_date as joiningDate',
                    'user_courses.user_id as userId'
            ]); 

        return {
            users: users.map(user => {
            return {
                ...user,
                groupIds: allUserGroups.filter(u => u.userId == user.userId).map(d => {
                    return {
                        name: d.name,
                        groupId: d.groupId
                    }
                }),
                joinedCourses: allUserCourses.filter(u => u.userId == user.userId).map(d => {
                    return {
                        name: d.name,
                        courseId: d.courseId,
                        joiningDate: d.joiningDate
                    }
                })
            }
        }), 
        totalNumberOfRecords: totalNumberOfRecords[0].count
    };  
}

async function getAllUsers(loggedInUser, organizationId, includeInactive) {
    organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

    let model = knex.table('employees')
        .innerJoin('users','users.user_id','employees.user_id')
        .where('employees.organization_id', organizationId)        
        .andWhere('users.is_super_admin', 0);
    
    if (!includeInactive)
        model.andWhere('employees.is_active', true)

    const users = await model.orderBy('surname')
    .select([
        'employees.employee_id',
        'users.name',
        'users.surname'
    ]);

    return users.map(u => {return {
        employeeId: u.employee_id,
        name: `${u.name} ${u.surname}`
    }});
}

async function getByEmployeeId(user, employeeId, programId) {

    let selectEmployee =  knex.select([
        'users.user_id as userId', 
        'users.email', 
        'users.name',
        'users.surname',
        'users.gender',
        'users.phone_number as phoneNumber',
        'users.pager_number as pagerNumber',
        'users.start_date as startDate',        
        'users.profile_photo as profilePhoto', 
        'employees.is_active as isActive',      
        'employees.employee_id as employeeId',
        'employees.exp_level_id as expLevelId',
        'employee_programs.program_id as programId',
        'experience_levels.name as expLevelName',
        'employees.organization_id as organizationId',
        'employee_roles.role_id as roleId',
        'roles.name as roleName'
    ])
    .from('employees')
    .join('users','users.user_id','employees.user_id')
    .leftJoin('experience_levels','employees.exp_level_id','experience_levels.exp_level_id')
    .leftJoin('employee_programs','employees.employee_id','employee_programs.employee_id')
    .leftJoin('employee_roles','employees.employee_id','employee_roles.employee_id')
    .leftJoin('roles','roles.role_id','employee_roles.role_id');
    
    if(user.role != Role.SuperAdmin) {
        selectEmployee.andWhere('employees.organization_id', user.organization);
    }

    let userData = await selectEmployee
    .where('employees.employee_id', employeeId)
    .limit(1)
    .first();

    if(userData) {
        const groups = await knex.table('groups_employee')
        .join('employees', 'employees.employee_id', 'groups_employee.employee_id')
        .join('groups', 'groups.group_id', 'groups_employee.group_id')
        .andWhere('employees.employee_id', employeeId)
        .select([
            'groups.group_id as groupId',
            'groups.name as name'
         ]);

        userData.groupIds = groups.map(d => ({
            name: d.name,
            groupId: d.groupId
        }));

        let coursesData  = knex.select(['courses.course_id as courseId',
        'courses.name as name',
        'courses.content_path as contentPath',
        'courses.image',
        'courses.description as description',
        'courses.period_days as periodDays',
        'courses.starting_date as startingDate',
        'courses.program_id as programId'
        ])
        .from('user_courses')
        .join('courses', 'user_courses.course_id', 'courses.course_id');

        if(programId)
        {
            coursesData.andWhere('courses.program_id', programId);
        }

        let courses = await coursesData
        .where('user_courses.user_id', userData.userId);

        userData.joinedCourses = courses.map(d => ({
            name: d.name,
            courseId: d.courseId,
            contentPath: d.contentPath,
            image : d.image,
            description : d.description,
            periodDays : d.periodDays,
            startingDate : d.startingDate,
            programId : d.programId
        }));
    }

    return userData
}

async function getByUserId(user, userId) {

    let select =  knex.select([
            'user_id as userId', 
            'email', 
            'name',
            'surname',
            'gender',
            'phone_number as phoneNumber',
            'pager_number as pagerNumber',
            'start_date as startDate',
            'profile_photo as profilePhoto'
        ])
        .from('users');

        let userData = await select
        .where('user_id', userId)
        .limit(1)
        .first();
        
        if(userData) {
            const groups = await knex.table('groups_employee')
            .join('employees', 'employees.employee_id', 'groups_employee.employee_id')
            .join('groups', 'groups.group_id', 'groups_employee.group_id')
            .andWhere('employees.user_id', userId)
            .select([
            'groups.group_id as groupId',
            'groups.name as name'
            ]);

            userData.groupIds = groups.map(d => ({
                name: d.name,
                groupId: d.groupId
            }));
        }

        return userData
}

async function checkIfEmailExists(email, userId) {
  let model = knex("users")
    .whereRaw('lower(email) = ?', email.toLowerCase());

  if (userId) model.whereNot("user_id", userId);

  let x = await model.count().first();

  if (x.count > 0) return true;
  else return false;
}

async function updateProfilePhoto(loggedInUser, userId, profilePhoto) {    
  return knex("users")
    .where("user_id", userId)
    .update({
      profile_photo: Buffer.from(profilePhoto)
    });
}

async function changePassword({oldPassword, newPassword}, user) {    
    console.log("Change password:", oldPassword, newPassword, user)
    const userExists = await knex("users")
      .where("user_id", user.sub)
      .select([
          'password'
      ]);

    if(userExists && userExists.length > 0 && userExists[0].password) {
       
        const passIsValid = await bcrypt.compare(oldPassword, userExists[0].password);
        //console.log('Hashed compare:', passIsValid)

        if(passIsValid) {
            await knex("users")
            .where("user_id", user.sub)
            .update({
                password: bcrypt.hashSync(newPassword, 10)
            });

            return {isValid: true}
        }
    }

    return { isValid: false, errorDetails: "User not found" };
  }

  async function deleteEmployees(loggedInUser, organizationId, employees) {
    console.log("Delete employees service: ", employees); 
    organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

    let employeeIds = await knex('employees')
        .whereIn('employee_id', employees)
        .andWhere('organization_id', organizationId)
        .select('employee_id')
        .map(t => t.employee_id);

    let userIds = await knex('employees')
        .whereIn('employee_id', employeeIds)
        .select(['user_id'])
        .map(t => t.user_id);
        
    return knex
    .transaction(async function(t) {
        return knex.transaction(async function(t) {
            await knex("activity_participants")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();
            
            await knex("employee_programs")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("employee_roles")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("program_directors")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("employee_exp_levels")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("log_activity_supervisors")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("activity_replies")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("employee_announcement_reads")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("employees")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("users")
            .transacting(t)
            .whereIn("user_id", userIds)
            .del();

            await knex("user_courses")
            .transacting(t)
            .whereIn("user_id", userIds)
            .del();
        });        
    });
  }


  async function updateProfileData(loggedInUser, phoneNumber, pagerNumber) {
      console.log('updateProfileData loggedInUser', loggedInUser);
      return await knex('users')
        .where("user_id", loggedInUser.sub)
        .update({
            phone_number: phoneNumber,
            pager_number: pagerNumber
        })
  }

  async function updateBulk(loggedInUser, data, organizationId) {

    organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;
  
    let updates = [];
    let output = [];

    async function UpdateLearnerAsync(t, userData) {
      return new Promise(async function(resolve, reject) {     
        if(userData.joinedCourses && userData.joinedCourses.length > 0)
        { 
            userData.joinedCourses.forEach(course => {
                let insertUserCourse = {
                user_id: userData.userId,
                is_able_to_join: true,
                course_id: course,
                joining_date: knex.fn.now()
            };

            return t
            .into("user_courses")
            .insert(insertUserCourse)
            .then(() =>  {
                output.push({ ...userData, status: "ok" });
            })
            .catch(err => {
              output.push({ ...userData, isValid: false, status: "error", errorDetails: err });
              return resolve();
            }); 
          }); 
        }
  
        if(userData.groupIds && userData.groupIds.length > 0)
        {  
            userData.groupIds.forEach(group => {
                let employeeGroups = {
                employee_id: userData.employeeId,
                group_id: group 
              };        
              
              return t
              .into("groups_employee")
              .insert(employeeGroups)
              .then(() =>  {
                  output.push({ ...userData, status: "ok" });
               })
              .catch(err => {
                  output.push({ ...userData, isValid: false, status: "error", errorDetails: err });
                  return resolve();
                }); 
              }); 
            }          
            return resolve();
        }).
        catch(error => {
            return {
                isValid: false,
                errorDetails: error
              };
        });
      }
  
    const MapToArray = t => {
      data.forEach(user => {
        updates.push(UpdateLearnerAsync(t, user));
      });
    };
  
    return await knex
      .transaction(t => { 
        MapToArray(t);  
        Promise.all(updates)        
          .then(() => {
            return t.commit(output);
          })
          .catch(err => {
            return t.rollback(output);
          });
      })
      .catch(error => {
        console.log('inside rollback err ', output);
        t.rollback();
        return {
          isValid: false,
          errorDetails: error
        };
      });
  }