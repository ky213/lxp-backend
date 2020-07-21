module.exports = {
    Admin: 'Admin',
    SuperAdmin: 'SuperAdmin',
    LearningManager: 'LearningManager',
    ProgramDirector: 'ProgramDirector',
    CourseManager: 'CourseManager',
    Learner: 'Learner',

    getCmRoles
}

function getCmRoles()
{
    return [this.Admin, this.LearningManager, this.ProgramDirector, 
        this.CourseManager];
}

