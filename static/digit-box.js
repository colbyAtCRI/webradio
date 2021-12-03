function newDiv(my_class)
{
    let elem = document.createElement('div');
    elem.setAttribute('class',my_class);
    return elem;
}

class Digit
{
    constructor(inc) {
        this.inc = inc;
        this.elem = newDiv('digit');
        this.txt = newDiv('digit-text');
        this.txt.innerHTML = '0';
        this.elem.appendChild(this.txt);
        this.up = newDiv('top-cover');
        this.elem.appendChild(this.up);
        this.down = newDiv('bottom-cover');
        this.elem.appendChild(this.down);
        this.change = undefined;
        this.up.onclick = function()
        {
            if (this.change)
                this.change(this.inc);
        }.bind(this);
        this.down.onclick = function() 
        {
            if (this.change)
                this.change(-this.inc);
        }.bind(this);
    }

    element() {
        return this.elem;
    }

    getValue() {
        return this.inc * Number(this.txt.innerHTML);
    }

    setValue(val) {
        this.txt.innerHTML = String(val);
    }
}

class DigitBox
{
    minValue = 0;
    maxValue = 2000000000;
    digits = [];
    action;

    constructor(id,ndigit) {
        let element = document.getElementById(id);
        for (let n = 0; n < ndigit; n++) {
            this.digits[n] = new Digit(Math.pow(10,n));
        }
        for (let n = 0; n < ndigit; n++) {
            let k = ndigit - n - 1;
            element.appendChild(this.digits[k].element());
            if ((k + 1) % 3 === 0) 
                this.digits[k].element().style.borderLeft = '5px solid orange';
        }
        this.change = function(inc)
        {
            let value = this.getValue();
            value += inc;
            if (value >= this.minValue && value <= this.maxValue) {
                if (this.action)
                    this.action(value);
            }
        }.bind(this);
        for (let digit of this.digits)
            digit.change = this.change;
    }

    onchange(fnc) {
        this.action = fnc;
    }

    getValue() {
        let value = 0;
        for (let digit of this.digits)
            value += digit.getValue();
        return value;
    }

    setValue(value) {
        for (let digit of this.digits)
            digit.setValue(0);
        let str = String(Math.floor(value));
        for (let n = 0; n < str.length; n++) {
            let k = str.length - n - 1;
            this.digits[k].setValue(Number(str[n]));
        }
    }
}

