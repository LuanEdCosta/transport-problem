$(document).ready(function () {
  $('[reset]').click(function () {
    $(this).blur();
    disableInputs(false);
    $('[xVal], [yVal]').val('');
    $('[tableContainer], [resultTable]').empty();
    clearErrors();
    $('[xVal]').focus();
    $('[result]').hide();
  });

  $('[calculate]').click(function () {
    $(this).blur();
    if (xyIsValid()) {
      clearErrors();
      calculate();
    } else {
      setError(0);
    }
  });
});

function xyIsValid() {
  var entries = getXY();
  return entries.x > 1 && entries.y > 1 &&
    isNumberValid(entries.x) && isNumberValid(entries.y);
}

function getXY() {
  return {
    x: Number($('[xVal]').val()),
    y: Number($('[yVal]').val())
  }
}

function isNumberValid(number) {
  return !Number.isNaN(number) && Number.isInteger(number);
}

function calculate() {
  if ($('[tableContainer] table').length === 0) {
    printCostTable();
    disableInputs(true);
  } else {
    calculateAndPrintResult(function (isInitialValue, costs, transport) {
      if ($('[cantonoroeste]').hasClass('selected')) {
        return isInitialValue ? { i: 0, j: 0 } : getNorthwestNewTarget(transport);
      } else {
        return getMinimalCostNewTarget(costs, transport);
      }
    });
  }
}

function calculateAndPrintResult(getTargetCallback) {
  var costTableData = getCostTableData();
  if (costTableData) {
    var entries = getXY(), transport = [];

    for (var i = 0; i < entries.x; i++) {
      transport.push([]);
      for (var j = 0; j < entries.y; j++) {
        transport[i][j] = null;
      }
    }

    var target = getTargetCallback(true, costTableData.costs, transport);

    do {
      var maxLine = [], maxCol = [];
      //Line sum
      for (var i = 0; i < entries.x; i++) {
        maxLine[i] = 0;
        for (var j = 0; j < entries.y; j++) {
          if (transport[i][j] !== null) {
            maxLine[i] += transport[i][j];
          }
        }
      }

      //Col Sum
      for (var i = 0; i < entries.y; i++) {
        maxCol[i] = 0;
        for (var j = 0; j < entries.x; j++) {
          if (transport[j][i] !== null) {
            maxCol[i] += transport[j][i];
          }
        }
      }

      var maxRowMinusRowSum = (costTableData.maxRow[target.i] - maxLine[target.i]);
      var maxColMinusColSum = (costTableData.maxColumn[target.j] - maxCol[target.j]);

      if (maxRowMinusRowSum < maxColMinusColSum) {
        transport[target.i][target.j] = maxRowMinusRowSum;
        for (var i = 0; i < entries.y; i++) {
          if (transport[target.i][i] === null) {
            transport[target.i][i] = 0;
          }
        }
        target = getTargetCallback(false, costTableData.costs, transport);

      } else if (maxRowMinusRowSum > maxColMinusColSum) {
        transport[target.i][target.j] = maxColMinusColSum;
        for (var i = 0; i < entries.x; i++) {
          if (transport[i][target.j] === null) {
            transport[i][target.j] = 0;
          }
        }
        target = getTargetCallback(false, costTableData.costs, transport);

      } else {
        transport[target.i][target.j] = maxRowMinusRowSum;
        target = getTargetCallback(false, costTableData.costs, transport);
      }
    } while (target !== null);

    var finalCost = getFinalCost(transport, costTableData.costs);
    $('[resultTable]').empty();
    $('[result]').show();
    $('[finalCost]').text('R$ ' + finalCost);

    var bodyLines = getTableBodyLines(entries, function (i, j, isLast, lastColumn) {
      j = j - 1;
      if (isLast) { //Last Line
        return costTableData.maxColumn[j];
      } else if (lastColumn) { //Not Last Line and Last Column
        return costTableData.maxRow[i];
      }
      return transport[i][j];
    })

    printTable(
      '[resultTable]',
      getTableHeader(entries),
      bodyLines,
      'Tabela com os valores de transporte:'
    );
  }
}

function getFinalCost(transport, costs) {
  var finalCost = 0;
  for (var i = 0; i < costs.length; i++) {
    for (var j = 0; j < costs[i].length; j++) {
      finalCost += transport[i][j] * costs[i][j];
    }
  }
  return finalCost;
}

function getNorthwestNewTarget(transport) {
  //The new target is the next null value
  var target = null;
  for (var i = 0; i < transport.length; i++) {
    for (var j = 0; j < transport[i].length; j++) {
      if (transport[i][j] === null && target === null) {
        target = {
          i: i,
          j: j
        };
      }
    }
  }
  return target;
}

function getMinimalCostNewTarget(costs, transport) {
  //The new target is the minor cost in the table
  var target = null, minor = null;
  for (var i = 0; i < costs.length; i++) {
    for (var j = 0; j < costs[i].length; j++) {
      if (transport[i][j] === null) {
        if (minor === null) {
          minor = costs[i][j];
          target = {
            i: i,
            j: j
          };
        }
        if (costs[i][j] < minor) {
          minor = costs[i][j];
          target = {
            i: i,
            j: j
          };
        }
      }
    }
  }
  return target;
}

function getCostTableData() {
  var entries = getXY(), allValuesIsValid = true;

  var costs = [], costArray = [], counter = 0;
  $('[costInp]').each(function () {
    var cost = Number($(this).val());
    if ($(this).val() !== '' && cost >= 0 && isNumberValid(cost)) {
      costArray[counter] = cost;
      counter++;
      if (counter === entries.y) {
        counter = 0;
        costs.push(costArray);
        costArray = [];
      }
    } else {
      allValuesIsValid = false;
      setError(1);
    }
  });

  var maxRow = [], maxColumn = [], columnSum = 0, rowSum = 0;
  counter = 0;
  $('[maxInp]').each(function (i) {
    var max = Number($(this).val());
    if ($(this).val() !== '' && max >= 0 && isNumberValid(max)) {
      if (i < entries.x) {
        maxRow[counter] = max;
        columnSum += max;
      } else {
        if (maxColumn.length === 0) { counter = 0; }
        maxColumn[counter] = max;
        rowSum += max;
      }
      counter++;
    } else {
      allValuesIsValid = false;
      setError(1);
    }
  });

  if (rowSum !== columnSum) {
    setError(2);
  } else if (allValuesIsValid) {
    clearErrors();
    return {
      maxRow: maxRow,
      maxColumn: maxColumn,
      costs: costs
    }
  }
}

function printCostTable() {
  //contructing the cost table
  var entries = getXY();
  var bodyLines = getTableBodyLines(entries, function (i, j, isLast, lastColumn) {
    return '<input class="data-inp font-weight-bold" placeholder="-" type="text" ' +
      (isLast || (!isLast && lastColumn) ? 'maxInp' : 'costInp') + '>';
  });

  printTable(
    '[tableContainer]',
    getTableHeader(entries),
    bodyLines,
    'Digite nesta tabela os custos de transporte. Mude de campo usando o TAB.'
  );
}

function getTableBodyLines(entries, getCellValue) {
  var bodyLines = '';
  for (var i = 0; i <= entries.x; i++) {
    var bodyColumns = '';
    for (var j = 0; j < (entries.y + 2); j++) {
      var isLast = i === entries.x;
      var firstColumn = j === 0, lastColumn = j === (entries.y + 1);
      if (isLast) {
        if (firstColumn) {
          bodyColumns += '<td>Nece.</td>';
        } else if (lastColumn) {
          bodyColumns += '<td></td>';
        } else {
          bodyColumns += '<td>' + getCellValue(i, j, isLast, lastColumn) + '</td>';
        }
      } else {
        bodyColumns += '<td>' + (firstColumn ? (i + 1) : getCellValue(i, j, isLast, lastColumn)) + '</td>';
      }
    }
    bodyLines += '<tr>' + bodyColumns + '</tr>';
  }
  return bodyLines;
}

function getTableHeader(entries) {
  var header = '';
  for (var i = 0; i < (entries.y + 2); i++) {
    var isFirst = i === 0, isLast = i === (entries.y + 1);
    if (isFirst) {
      header += '<th></th>';
    } else if (isLast) {
      header += '<th>Disp.</th>';
    } else {
      header += '<th>' + (i) + '</th>';
    }
  }
  return header;
}

function printTable(destiny, header, bodyLines, description = '') {
  $(destiny).append(
    '<div class="font-italic mb-3">' + description + '</div>'
    + '<table class="table table-bordered table-striped data-table text-center table-responsive-xs">'
    + '<thead>'
    + header
    + '</thead>'
    + '<tbody>'
    + bodyLines
    + '</tbody>'
    + '</table>'
  );
}

function disableInputs(enable) {
  $('[xval], [yval]').prop('disabled', enable);
}

function setError(code) {
  code = code || 0;
  if ($('[error] div[code=' + code + ']').length === 0) {
    $('[error]').append('<div code="' + code + '">' + getError(code) + '</div>');
  }
}

function clearErrors() { $('[error]').empty(); }

function getError(code) {
  switch (code) {
    case 0: { return '- Preencha X e Y com valores inteiros e positivos!'; }
    case 1: { return '- Preencha todos os campos de custo com valores inteiros e positivos!'; }
    case 2: { return '- As quantidades máximas não estão balanceadas!'; }
  }
}
