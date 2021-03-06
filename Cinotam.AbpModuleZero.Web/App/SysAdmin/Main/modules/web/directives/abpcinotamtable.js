(function() {
    /**Im to lazy to rewrite code :( */
    'use strict';
    angular
        .module('app.web')
        .directive('abpCinotamTable', AbpCinotamTable);
    AbpCinotamTable.$inject = ['WebConst'];
    function AbpCinotamTable(webConst) {
        // Usage:
        //  <user-selector user-selected='$scope.onSelected()' />
        // Creates:
        //  Table of users
        var directive = {
            bindToController: true,
            controller: AbpCinotamTableController,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            templateUrl: webConst.contentFolder + 'directives/abpcinotamtable.cshtml',
            scope: {
                tProperties: '=properties',
                tFunctions: '=funcobj',
                tLeftActions: '=pushActionsOnTheLeft',
                tBtnsPosition: '@btnPositionClass',
                tAjaxUrl: '=url',
                tdata: '=data',
                tDefaultSearch: '=defaultSearch',
                tColDefs: '=colDefs',
                tServerSide: '=serverSide',
                tOnInstanceReady: '=instanceReady',
                tOnTableError: '=onTableError'
            }
        };
        return directive;
    }
    function link(scope, element, attrs) {
    }
    /* @ngInject */
    AbpCinotamTableController.$inject = ['abp.services.app.user', 'DTOptionsBuilder', 'DTColumnBuilder', 'DTColumnDefBuilder', '$compile', '$scope', 'WebConst', 'logger'];
    function AbpCinotamTableController(_userService, DTOptionsBuilder, DTColumnBuilder, DTColumnDefBuilder, $compile, $scope, webConst, logger) {
        var vm = this;
        $scope.vm.requestData = undefined;
        //Holds the data table instance in the vm.instance variable of the parent

        vm.dtInstance = function(instance) {
            $scope.$parent.vm.instance = instance;
            $scope.$parent.vm.instance.isReady = true;
            $scope.$parent.vm.instance.updateRequest = function(reqObj) {
                $scope.vm.requestData = buildRequestData(reqObj, $scope.vm.tProperties, $scope.vm.tDefaultSearch);
                ajaxOptions = {
                    url: url,
                    type: 'POST',
                    data: function() {
                        return $scope.vm.requestData;
                    }
                }
                instance.reloadData();
            }
            if ($scope.vm.tOnInstanceReady) {
                $scope.vm.tOnInstanceReady(instance);
            }
        };
        if ($scope.vm.tOnTableError) {
            $.fn.dataTable.ext.errMode = function(e, settings, techNote, message) {
                $scope.vm.tOnTableError(settings, helpPage, message);
            };
        }
        else {
            $.fn.dataTable.ext.errMode = function(e, techNote, message) {

                //For Asp.Net error
                var responseText = e.jqXHR.responseText;
                var element = $(responseText).next('title')[0];
                if (element) {
                    message = element.innerHTML;
                }
                //For Asp.Net error
                logger.warning(message, {}, 'Error');
            };
        }
        vm.dtColumnDefs = [];
        var url = $scope.vm.tAjaxUrl;
        vm.users = [];
        vm.dtColumns = [];
        var ajaxOptions = {};
        if ($scope.vm.tColDefs) {
            //Builds the column definitions
            $scope.vm.tColDefs.forEach(function(element) {
                vm.dtColumnDefs.push(DTColumnDefBuilder.newColumnDef(element.target).renderWith(element.render));
            });
        }

        if (!$scope.vm.requestData && !$scope.vm.tServerSide) {
            $scope.vm.requestData = function() {
                return buildRequestData($scope.vm.tdata, $scope.vm.tProperties, $scope.vm.tDefaultSearch);
            }
        }
        else {
            $scope.vm.requestData = buildRequestData($scope.vm.tdata, $scope.vm.tProperties, $scope.vm.tDefaultSearch);
        }
        console.log('data obj', $scope.vm.requestData);
        ajaxOptions = {
            url: url,
            type: 'POST',
            data: $scope.vm.requestData
        }
        vm.dtOptions = DTOptionsBuilder.newOptions(vm.tableOptions).withOption('ajax', ajaxOptions).withDataProp('data')
            .withOption('processing', true)
            .withOption('createdRow', createdRow)
            .withOption('stateSave', true)
            .withOption('serverSide', $scope.vm.tServerSide)
            .withOption('createdRow', createdRow)
            .withPaginationType('full_numbers')
            .withOption('createdRow', createdRow)
            .withLanguage(webConst.datatablesLangConfig);
            // .withOption('responsive', true);
        var btnPosition = '';
        if ($scope.vm.tBtnsPosition) {
            btnPosition = $scope.vm.tBtnsPosition;
        }
        if ($scope.vm.tFunctions) {
            var actionBtns = DTColumnBuilder.newColumn(null)
                .withTitle(App.localize("Actions"))
                .notSortable()
                .withClass(btnPosition)
                .renderWith(loadCustom);
        }
        if ($scope.vm.tLeftActions) {
            //Push the action buttons first so they can appear on the left 
            vm.dtColumns = buildColumns(actionBtns, $scope.vm.tProperties);
        }
        else {
            vm.dtColumns = buildColumns(null, $scope.vm.tProperties);
            if ($scope.vm.tFunctions) {
                vm.dtColumns.push(actionBtns);
            }
        }
        vm.registeredFunctions = [];

        /**
             * Push all the functions inside the registeredFunctions array
             * @param  data, type, full, meta
             */
        function loadCustom(data, type, full, meta) {
            var btns = " ";
            if ($scope.vm.tFunctions) {
                for (var i = 0; i < $scope.vm.tFunctions.length; i++) {
                    var current = $scope.vm.tFunctions[i];
                    btns += current.dom(data, type, full, meta).toString() + " "; //Space between buttons
                    vm.registeredFunctions.push({
                        name: current.name,
                        func: current.action
                    });
                }
            }

            return btns;
        }
        /**
             * Builds the default request object for the table (helps to avoid unnecessary rebuilds)
             * @param  tdata, properties, defaultSearch
             */
        function buildRequestData(tdata, properties, defaultSearch) {
            var propString = [''];
            properties.forEach(function(property) {
                if (!property.onlyHolder) {
                    propString.push(property.Key);
                }
            });
            var dataObj = {
                propToSearch: defaultSearch,
                requestedProps: propString
            };
            if (tdata) {
                angular.extend(dataObj, tdata);
            }

            return dataObj;
        }

        /**
             * Recompiles the rows table to allow angular binding
             * @param  row, data, dataIndex
             */
        function createdRow(row, data, dataIndex) {
            // Recompiling so we can bind Angular directive to the DT
            $compile(angular.element(row).contents())($scope);
        }
        /**
             * Recompiles the table columns to allow angular binding
             * @param  row, data, dataIndex
             */
        function createdColumn(col, data, dataIndex) {
            $compile(angular.element(col).contents())($scope);
        }
        /**
             * Build the columns for the table
             * @param insertBefore buttons to be placed in the left
             * @param properties the array of properties [Key,DisplayName(localizable)] that the directive should display in the table
             * @returns {DTColumns} the options
             */
        function buildColumns(insertBefore, ctrlProperties) {
            if (!ctrlProperties) ctrlProperties = [];
            var columns = [];
            if (insertBefore) {
                columns.push(insertBefore);
            }
            if (ctrlProperties.length <= 0) {
                throw new Error('Properties not defined');
            }
            for (var i = 0; i < ctrlProperties.length; i++) {
                var currentProperty = ctrlProperties[i];

                if (currentProperty.Hidden) {
                    columns.push(
                        DTColumnBuilder.newColumn(currentProperty.Key)
                            .withTitle(App.localize(currentProperty.DisplayName)).notVisible().withOption(createdColumn));
                }
                else {
                    if (currentProperty.onlyHolder) {
                        columns.push(
                            DTColumnBuilder.newColumn(currentProperty.Key)
                                .withTitle(App.localize(currentProperty.DisplayName)).withOption(createdColumn).notSortable());
                    }
                    else {
                        if (currentProperty.Responsive) {
                            console.log('Is responsive');
                            columns.push(
                                DTColumnBuilder.newColumn(currentProperty.Key)
                                    .withTitle(App.localize(currentProperty.DisplayName)).withClass('none').withOption(createdColumn));
                        }
                        else {
                            columns.push(
                                DTColumnBuilder.newColumn(currentProperty.Key)
                                    .withTitle(App.localize(currentProperty.DisplayName)).withOption(createdColumn));
                        }
                    }
                }

            }
            return columns;
        }

    }
})();