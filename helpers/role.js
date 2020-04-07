module.exports = {
    Admin: 'Admin',
    SuperAdmin: 'SuperAdmin',
    InstituteManager: 'InstituteManager',
    ProgramDirector: 'ProgramDirector',
    FacultyMember: 'FacultyMember',
    Resident: 'Resident',

    getFmRoles
}

function getFmRoles()
{
    return [this.Admin, this.InstituteManager, this.ProgramDirector, 
        this.FacultyMember];
}

