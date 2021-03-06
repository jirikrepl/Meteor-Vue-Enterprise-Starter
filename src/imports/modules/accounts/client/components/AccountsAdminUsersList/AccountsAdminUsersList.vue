<style>
/* can't do scoped styles here because iView table doesn't prepend the unique class scope to classnames */
.AccountsAdminUsersList .table-loading {
  margin: 0 auto;
  width: 50px;
  height: 300px;
  vertical-align: center;
  padding-top: 125px;
}
.AccountsAdminUsersList .table-loading .ivu-spin-dot{
  height: 100px;
  width: 100px;
}
.AccountsAdminUsersList .ivu-btn {
  width: 12em;
}
.AccountsAdminUsersList .number-column {
  text-align: left;
}
.AccountsAdminUsersList .number-cell {
  width: 6em;
}
.AccountsAdminUsersList .name-column {
  max-width: 20%;
}
.AccountsAdminUsersList .role-column {
  text-align: center;
}
.AccountsAdminUsersList .ivu-icon-arrow-down-b {
  position: absolute;
  right: 1em;
}
.AccountsAdminUsersList tr:hover {
  /* border: 1px solid red; */
}

.AccountsAdminUsersList .current-user {
  color: #009dff
}

.AccountsAdminUsersList .page-links-container {
  margin-top: 10px;
  height: 4em;
}
.AccountsAdminUsersList .ivu-page {
  float: right;
}
</style>

<template>
  <div class='AccountsAdminUsersList'>
    <div v-if='getUsersWithRolesLoading || !this.usersWithRoles' class='table-loading-container'>
      <Spin size='large' class='table-loading'></Spin>
    </div>
    <div v-if='!getUsersWithRolesLoading || this.usersWithRoles.length' class='table-container'>
      <Table v-if='!getUsersWithRolesLoading' :columns='tableData.columns' :data='tableData.rows' no-data-text='No Data' :row-class-name='rowClassName'></Table>
      <div class='page-links-container'>
        <Page :total='pagesTotalNumber' show-elevator :page-size='pageSizeInt' @on-change='handlePageChange' :current='pageNumberInt'></Page>
      </div>
    </div>
  </div>
</template>

<script>
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/alanning:roles';
import { globalUserRoles } from './../../../shared/constants/global-user-roles';
import { mapActions, mapState } from 'vuex-alt';
import iView from 'iview';

export default {
  name: 'AccountsAdminUsersList',
  async created() {
    try {
      await this.getUsersWithRoles({ startIndex: this.usersWithRolesStartIndex });
    } catch (e) {
      // handled in vuex
    }
  },
  destroyed() {
    this.clearGetUsersWithRolesFailure();
  },
  methods: {
    ...mapActions({
      getUsersWithRoles: (actions) => actions.accounts.getUsersWithRoles,
      clearGetUsersWithRolesFailure: (actions) => actions.accounts.clearGetUsersWithRolesFailure,
      setUserGlobalRole: (actions) => actions.accounts.setUserGlobalRole
    }),
    rowClassName (row, index) {
      if (row._id === Meteor.userId()) {
        return 'current-user';
      }
      return '';
    },
    isCurrentUserAndAdmin(userId) {
      if (Meteor.userId() === userId) {
        return Roles.userIsInRole(userId, [globalUserRoles.ADMIN, globalUserRoles.SUPER_ADMIN], Roles.GLOBAL_GROUP);
      }
    },
    isUserSuperAdmin(userId) {
      return Roles.userIsInRole(userId, [globalUserRoles.SUPER_ADMIN], Roles.GLOBAL_GROUP);
    },
    isUserAdmin(userId) {
      return Roles.userIsInRole(userId, [globalUserRoles.ADMIN], Roles.GLOBAL_GROUP);
    },
    handlePageChange(val) {
      this.$router.push({ name: 'accounts-admin', query: { page: val }});
      const startIndex = this.usersWithRolesStartIndex;
      this.getUsersWithRoles({ startIndex });
    },
    async changeUserRole({ userId, role }) {
      try {
        this.$Loading.start();
        const success = await this.setUserGlobalRole({ userId, role });
        if (success) {
          try {
            await this.getUsersWithRoles({ startIndex: this.usersWithRolesStartIndex });
            this.$Loading.finish();
          } catch (e) {
            this.$Loading.error();
          }
        } else {
          this.$Loading.finis();
        }
      } catch (e) {
        this.$Loading.error();
      }
    }
  },
  computed: {
    ...mapState({
      getUsersWithRolesLoading: (state) => state.accounts.getUsersWithRolesLoading,
      usersWithRoles: (state) => state.accounts.usersWithRoles,
      allUsersCount: (state) => state.accounts.allUsersCount,
      pageNumber: (state) => state.route.query.page || 1,
      pageSize: (state) => state.accounts.usersWithRolesPageSize
    }),
    usersWithRolesStartIndex() {
      return (this.pageNumber - 1 ) * this.pageSize;
    },
    pagesTotalNumber() {
      return this.allUsersCount;
    },
    pageNumberInt() {
      try {
        return parseInt(this.pageNumber, 10);
      } catch (e) {
        return 1;
      }
    },
    pageSizeInt() {
      try {
        return parseInt(this.pageSize, 10);
      } catch (e) {
        return 14;
      }
    },
    tableData() {
      // store for access in render() function
      const isCurrentUserAndAdmin = this.isCurrentUserAndAdmin;
      const isUserSuperAdmin = this.isUserSuperAdmin;
      const isUserAdmin = this.isUserAdmin;
      const changeUserRole = this.changeUserRole;
      return {
        columns: [
          {
            title: '#',
            key: 'number',
            className: 'number-column'
          },
          {
            title: 'Email',
            key: 'email',
            className: 'email-column'
          },
          {
            title: 'Name',
            key: 'name',
            className: 'name-column'
          },
          {
            title: 'Role',
            key: 'role',
            className: 'role-column',
            render: (h, params) => {
              // user Vue render function (vdom) to build custom dropdown for this cell
              return h('Dropdown', {
                class: {
                  'role-dropdown': true
                },
                props: {
                  trigger: 'click'
                },
                on: {
                  'on-click': (roleName) => {
                    changeUserRole({ userId: params.row._id, role: roleName });
                  }
                }
              }, [
                h('Button', [
                  h('span', params.row.role),
                  h('Icon', {
                    props: {
                      type: 'arrow-down-b'
                    }
                  })
                ]),
                h('Dropdown-menu', {
                  slot: 'list'
                }, Object.values(globalUserRoles).map((item, index) => {
                  return h('Dropdown-item', {
                    props: {
                      name: item,
                      disabled:
                      (
                        // if current user is an admin
                        isCurrentUserAndAdmin(params.row._id) &&
                        // don't allow them to remove themselves from admin
                        ([globalUserRoles.SUPER_ADMIN, globalUserRoles.ADMIN].indexOf(item) === -1)
                      ) ||
                      (
                        // if current user isn't Super Admin, don't allow them to set others as Super Admin
                        !isUserSuperAdmin(Meteor.userId()) &&
                        item === globalUserRoles.SUPER_ADMIN
                      ) ||
                      (
                        // if user being modified is admin, is being downgraded to less than admin, and 
                        // current user isn't super admin, don't allow it. (only super admins can downgrade an admin)
                        isUserAdmin(params.row._id) &&
                        [globalUserRoles.SUPER_ADMIN, globalUserRoles.ADMIN].indexOf(item) === -1 &&
                        !isUserSuperAdmin(Meteor.userId())
                      ) ||
                      (
                        // if current user is admin, dont let them set others to super admin
                        isUserAdmin(Meteor.userId()) &&
                        item === globalUserRoles.SUPER_ADMIN
                      )
                    }
                  }, item)
                }))
              ])
            }
          }
        ],
        rows: this.usersWithRoles && this.usersWithRoles.length ? this.usersWithRoles.map((thisUser, i) => {
          const thisCell = {
            _id: thisUser._id,
            number: (i + 1) + this.usersWithRolesStartIndex,
            email: thisUser.emails[0].address,
            role: thisUser.roles[Roles.GLOBAL_GROUP][0],
            name: thisUser.profile.lastName + ', ' + thisUser.profile.firstName,
            cellClassName: {
              number: 'number-cell'
            }
          };
          return thisCell;
        }) : []
      };
    }
  }
}
</script>