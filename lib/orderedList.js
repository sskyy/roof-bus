'use strict'

const util = require('./util')

class OrderedList {
  constructor(list) {
    list = list || []
    this._list = new Map
    this.head = null
    this.tail = null
    this._waitList = new Map
    this._defaultInsertCursor = null

    //Thanks for IE8's funny Object.defineProperty!!!!!!
    this.length = 0

    list.forEach((itemArgs) => {
      this.insert.apply(this, itemArgs)
    })
  }

  //Thanks for IE8's funny Object.defineProperty!!!!!!
  //  get length(){
  //    return this._list.size
  //  }
  normalizeOrder(order, key) {
    /*
     order 的互斥关系:
     1. first last 不能与before after 混用
     2. before 和 after 不能产生循环
     */
    const normalizedOrder = {}
    if (order.first) normalizedOrder.first = true
    if (order.last) normalizedOrder.last = true
    if (order.before) normalizedOrder.before = new Set([].concat(util.from(order.before)))
    if (order.after) normalizedOrder.after = new Set([].concat(util.from(order.after)))

    if ((normalizedOrder.first || normalizedOrder.last) && (normalizedOrder.before || normalizedOrder.after)) {
      throw new Error('order `first` and `last` cannot be used with `before` or `after` : ' + key)
    }
    const orderNamePair = {
      before: 'after',
      after: 'before'
    }

    Object.keys(orderNamePair).forEach((orderName) => {
      const reverseOrderName = orderNamePair[ key ]
      if (normalizedOrder[ orderName ]) {
        const orderValues = normalizedOrder[ orderName ].values()
        for (let orderTargetKey of orderValues) {
          //有我等的对象，也在等我
          if (this._waitList[ key ] && this._waitList[ key ][ orderTargetKey ]) {
            if (this._waitList[ key ][ orderTargetKey ][ orderName ].has(key)) {
              //如果我们互相before或者互相after
              throw new Error(`${key} has conflict order  ${orderName} with ${orderTargetKey}`)
            } else if (this._waitList[ key ][ orderTargetKey ][ reverseOrderName ].has(key)) {
              //如果我before他， 他after我，那就删掉一个
              normalizedOrder[ orderName ].delete(orderTargetKey)
            }
          }
        }
      }
    })

    return normalizedOrder
  }

  /*
   order 中的before 或者after必须是 数组或者 Set
   */
  insert(key, value, order) {
    order = order || {}
    //TODO before he after 都支持数组形式，对插入的数据使用index来
    if (key === undefined || value === undefined) throw new Error('key and value cannot be undefined')
    order = this.normalizeOrder(order, key)
    const obj = { value, key, order }

    if (this.isDependenciesLoaded(order)) {
      this.store(obj)
      this.storeRelier(obj.key)
    } else {
      this.lineUp(obj)
    }

    return this
  }

  store(obj) {
    if (this._list.get(obj.key)) {
      throw new Error(`${obj.key} already exist`)
    }

    if (this.length === 0) {
      this.head = this.tail = obj
    } else if (this.hasOrder(obj.order)) {
      obj.order.first && this.applyOrderFirst(obj)
      obj.order.last && this.applyOrderLast(obj)
      obj.order.before && obj.order.before.size && this.applyOrderBefore(obj)
      obj.order.after && obj.order.after.size && this.applyOrderAfter(obj)
    } else {
      this.applyOrderDefault(obj)
    }

    this._list.set(obj.key, obj)
    //Thanks for IE8's funny Object.defineProperty!!!!!!
    this.length ++
  }

  hasOrder(order) {
    return order.first || order.last || (order.before && order.before.size) || (order.after && order.after.size)
  }

  applyOrderDefault(obj) {
    //如果没有last元素，那么插在tail后面
    if (! this._defaultInsertCursor) {
      linkAfter(this.tail, obj)
      this.tail = obj
    } else {
      //如果有last元素 那么插在第一个last的上面
      linkAfter(this._defaultInsertCursor, obj)
      this._defaultInsertCursor = obj
    }
  }

  applyOrderFirst(obj) {
    linkBefore(this.head, obj)
    this.head = obj
  }

  applyOrderLast(obj) {
    const result = linkAfter(this.tail, obj)
    this.tail = obj

    //设置一个默认插入的地方
    if (! this._defaultInsertCursor) this._defaultInsertCursor = obj.prev

    return result
  }

  applyOrderAround(obj, orderName) {
    const orderKeys = util.from(obj.order[ orderName ])
    let aroundWhich = this._list.get(orderKeys[ 0 ])
    let cursor = aroundWhich
    const candidateKeys = orderKeys.slice(1)

    const headOrTail = orderName === 'before' ? 'head' : 'tail'
    const prevOrNext = orderName === 'before' ? 'prev' : 'next'
    const linkFn = orderName === 'before' ? linkBefore : linkAfter


    if (candidateKeys.length) {
      while (cursor !== this[ headOrTail ]) {
        cursor = cursor[ prevOrNext ]
        if (candidateKeys.includes(cursor.key)) aroundWhich = cursor
      }
    }

    linkFn(aroundWhich, obj)
    if (aroundWhich === this[ headOrTail ]) this[ headOrTail ] = obj
  }

  applyOrderBefore(obj) {
    return this.applyOrderAround(obj, 'before')
  }

  applyOrderAfter(obj) {
    return this.applyOrderAround(obj, 'after')
  }

  storeRelier(key) {
    if (this._waitList.get(key)) {

      for (let relier of this._waitList.get(key).values()) {
        relier._waiting.delete(key)
        if (relier._waiting.size === 0) this.store(relier)
      }
      this._waitList.delete(key)
    }
  }

  lineUp(obj) {
    let waitForKeys = []
    if (obj.order.before) waitForKeys = waitForKeys.concat(util.from(obj.order.before))
    if (obj.order.after) waitForKeys = waitForKeys.concat(util.from(obj.order.after))


    waitForKeys = new Set(waitForKeys.filter((key) => {
      return ! this._list.has(key)
    }))

    obj._waiting = waitForKeys


    util.from(obj._waiting).forEach((waitForKey) => {
      if (! this._waitList.has(waitForKey)) {
        this._waitList.set(waitForKey, new Map)
      }
      this._waitList.get(waitForKey).set(obj.key, obj)
    })

  }

  isDependenciesLoaded(order) {
    let dependencies = []
    if (order.before) dependencies = dependencies.concat(util.from(order.before.values()))
    if (order.after) dependencies = dependencies.concat(util.from(order.after.values()))


    return dependencies.every((dependency) => {
      return this._list.get(dependency)
    })
  }

  isReady() {
    return this._waitList.size === 0
  }

  forEach(handler) {
    let i = this.head
    while (i) {
      handler(i.value, i.key)
      i = i.next
    }
  }

  toArray() {
    const result = []
    this.forEach(function (value) {
      result.push(value)
    })

    return result
  }

  get(key) {
    if (this._list.get(key)) {
      return this._list.get(key).value
    } else {
      for (let list of this._waitList.values()) {
        for (let obj of list.values())
          if (obj.key === key) {
            return obj.value
          }
      }
    }
  }

  clone(cloneFn) {
    //TODO 改进TODO算法

    if (! this.isReady()) {
      throw new Error('can not clone unready ordered list')
    }

    const list = new OrderedList()

    let cursor = this.head
    while (cursor) {
      let order = {}
      if (cursor.order.first) order.first = true
      if (cursor.order.last) order.last = true
      if (cursor.order.before) order.before = util.from(cursor.order.before)
      if (cursor.order.after) order.after = util.from(cursor.order.after)

      list.insert(cursor.key, util.cloneDeep(cursor.value, cloneFn), order)
      cursor = cursor.next
    }

    return list
  }

  forEachAsync(handler, callback) {
    const root = this
    let iterationEnd = false

    function next(i, err) {
      if (err !== undefined) {
        return callback(err)
      }

      if (i !== undefined) {
        try {
          handler(i.value, next.bind(null, i.next))
        } catch (e) {
          //因为next层层try包裹了callback
          //如果callback继续抛出error，就会多次调用callback
          if (! iterationEnd) {
            try {
              iterationEnd = true
              callback(e)
            } catch (e) {
              throw e
            }
          } else {
            throw e
          }
        }
      } else {
        return callback()
      }
    }

    next(root.head)
  }
}


function linkAfter(linkedObj, unLinkedObj) {
  if (! linkedObj || ! unLinkedObj) return
  unLinkedObj.prev = linkedObj

  if (linkedObj.next) {
    unLinkedObj.next = linkedObj.next
    unLinkedObj.next.prev = unLinkedObj
  }

  linkedObj.next = unLinkedObj
}

function linkBefore(linkedObj, unLinkedObj) {
  if (! linkedObj || ! unLinkedObj) return

  unLinkedObj.next = linkedObj
  if (linkedObj.prev) {
    unLinkedObj.prev = linkedObj.prev
    unLinkedObj.prev.next = unLinkedObj
  }
  linkedObj.prev = unLinkedObj
}


module.exports = OrderedList


