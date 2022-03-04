import {
  DECLARATION,
  serialize,
  Middleware,
  MEDIA,
  copy,
  replace,
} from "stylis";
import pxRegex from "./utils/pixel-unit-regex";
import filterPropList from "./utils/filter-prop-list";

type MiddlewareParams = Parameters<Middleware>;

const defaults = {
  rootValue: 16,
  unitPrecision: 5,
  selectorBlackList: [],
  propList: ["font", "font-size", "line-height", "letter-spacing"],
  replace: true,
  mediaQuery: false,
  minPixelValue: 0,
};

export function usePxtoremStylisPlugin(options: Record<string, unknown>) {
  let opts = Object.assign({}, defaults, options);
  let pxReplace = createPxReplace(
    opts.rootValue,
    opts.unitPrecision,
    opts.minPixelValue
  );

  let satisfyPropList = createPropListMatcher(opts.propList);

  function pxtoremStylisPlugin (
    element: MiddlewareParams[0],
    index: MiddlewareParams[1],
    children: MiddlewareParams[2],
    callback: MiddlewareParams[3]
  ) {
    switch (element.type) {
      case DECLARATION: {
        // This should be the fastest test and will remove most declarations
        if (element.value.indexOf("px") === -1) {
          return;
        }
        // let property = content.match(/(.*):.*/)[1]; //

        if (!satisfyPropList(element.props)) {
          return;
        }

        if (
          blacklistedSelector(opts.selectorBlackList, [element.parent?.value])
        )
          return;

        element.return = opts.replace
          ? element.value.replace(pxRegex, pxReplace)
          : element.value + element.value.replace(pxRegex, pxReplace);
        break;
      }
      case MEDIA: {
        if (!opts.mediaQuery) return;
        if (element.value.indexOf("px") === -1) return;
        return serialize(
          [
            // @ts-ignore
            copy(element, {
              // @ts-ignore
              value: replace(element.value, /@media.*/g, function _(mq: any) {
                return mq.replace(pxRegex, pxReplace);
              }),
            }),
          ],
          callback
        );
      }
    }
  };
  Object.defineProperty(pxtoremStylisPlugin, "name", {
    value: "pxtoremStylisPlugin",
  });
  return pxtoremStylisPlugin
}


function createPxReplace(
  rootValue: any,
  unitPrecision: any,
  minPixelValue: any
) {
  return function (m: any, $1: any) {
    if (!$1) {
      return m;
    }
    let pixels = parseFloat($1);
    if (pixels < minPixelValue) {
      return m;
    }
    let fixedVal = toFixed(pixels / rootValue, unitPrecision);
    return fixedVal === 0 ? "0" : fixedVal + "rem";
  };
}

function toFixed(number: any, precision: any) {
  let multiplier = Math.pow(10, precision + 1),
    wholeNumber = Math.floor(number * multiplier);
  return (Math.round(wholeNumber / 10) * 10) / multiplier;
}

function blacklistedSelector(blacklist: any, selectors: any) {
  return selectors.some(function (selector: any) {
    if (typeof selector !== "string") {
      return false;
    }
    return blacklist.some(function (regex: any) {
      if (typeof regex === "string") {
        return selector.indexOf(regex) !== -1;
      }
      return selector.match(regex);
    });
  });
}

function createPropListMatcher(propList: any) {
  let hasWild = propList.indexOf("*") > -1;
  let matchAll = hasWild && propList.length === 1;
  let lists = {
    exact: filterPropList.exact(propList),
    contain: filterPropList.contain(propList),
    startWith: filterPropList.startWith(propList),
    endWith: filterPropList.endWith(propList),
    notExact: filterPropList.notExact(propList),
    notContain: filterPropList.notContain(propList),
    notStartWith: filterPropList.notStartWith(propList),
    notEndWith: filterPropList.notEndWith(propList),
  };
  return function (prop: any) {
    if (matchAll) {
      return true;
    }
    return (
      (hasWild ||
        lists.exact.indexOf(prop) > -1 ||
        lists.contain.some(function (m: any) {
          return prop.indexOf(m) > -1;
        }) ||
        lists.startWith.some(function (m: any) {
          return prop.indexOf(m) === 0;
        }) ||
        lists.endWith.some(function (m: any) {
          return prop.indexOf(m) === prop.length - m.length;
        })) &&
      !(
        lists.notExact.indexOf(prop) > -1 ||
        lists.notContain.some(function (m: any) {
          return prop.indexOf(m) > -1;
        }) ||
        lists.notStartWith.some(function (m: any) {
          return prop.indexOf(m) === 0;
        }) ||
        lists.notEndWith.some(function (m: any) {
          return prop.indexOf(m) === prop.length - m.length;
        })
      )
    );
  };
}