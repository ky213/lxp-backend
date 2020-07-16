module.exports = {
    Admin: 'Admin',
    SuperAdmin: 'SuperAdmin',
    OrganizationManager: 'OrganizationManager',
    ProgramDirector: 'ProgramDirector',
    FacultyMember: 'FacultyMember',
    Resident: 'Resident',

    getFmRoles
}

function getFmRoles()
{
    return [this.Admin, this.OrganizationManager, this.ProgramDirector, 
        this.FacultyMember];
}

