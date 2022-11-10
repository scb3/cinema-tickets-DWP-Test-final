import TicketTypeRequest from "./lib/TicketTypeRequest.js";
import InvalidPurchaseException from "./lib/InvalidPurchaseException.js";

export default class TicketService {
  /**
   * Should only have private methods other than the one below.
   */

  //include predefined service methods
  paymentService;
  seatingService;

  //Set Types of Tickets
  prices = {
    ADULT: undefined,
    CHILD: undefined,
    INFANT: undefined,
  };
  //Set Max amount of tickets per user
  maxTickets = 20;

  constructor(paymentService, seatingService, prices, maxTickets) {
    //set catches for in case of no tickets and for if price entered is not a number

    if (Object.keys(prices).length === 0) {
      throw new Error("No tickets available");
    }
    if (isNaN(prices.ADULT) || isNaN(prices.CHILD) || isNaN(prices.INFANT)) {
      throw new Error("Invalid ticket price");
    }

    this.paymentService = paymentService;
    this.seatingService = seatingService;
    this.prices = prices;
    this.maxTickets = maxTickets;
  }

  purchaseTickets(accountId, ...ticketTypeRequests) {
    //throws InvalidPurchaseException
    //Validate that the number of tickets is not greater than the maxTickets
    let totalTickets = 0;
    ticketTypeRequests.forEach((ticket) => {
      totalTickets += ticket.quantity;
    });
    if (totalTickets > this.maxTickets) {
      throw new InvalidPurchaseException("Too many tickets");
    }

    //Validate that there is at least one adult ticket
    this.throwIfIncorrectTickets(ticketTypeRequests);
    this.throwIfNoAdultTickets(ticketTypeRequests);
    const numericAccountId = this.newId(accountId);

    //Seating
    const seatIds = this.seatingService.reserveSeats(totalTickets);
    this.seatingService.assignSeatsToAccount(numericAccountId, seatIds);

    //Payments
    const totalCost = this.calculateTotalCost(ticketTypeRequests);
    this.paymentService.chargeAccount(numericAccountId, totalCost);

    return true;
  }

  //if there are invalid ticket types
  throwIfIncorrectTickets(ticketTypeRequests) {
    const ticketTypes = Object.keys(this.prices);
    ticketTypeRequests.forEach((ticket) => {
      if (!ticketTypes.includes(ticket.type)) {
        throw new InvalidPurchaseException("Invalid ticket type");
      }
    });
  }
  //if no valid adult tickets
  throwIfNoAdultTickets(ticketTypeRequests) {
    const adultTickets = ticketTypeRequests.filter((ticket) => {
      return ticket.type === "ADULT";
    });
    if (adultTickets.length === 0) {
      throw new InvalidPurchaseException("No adult tickets");
    }
  }

  newId(accountId) {
    if (typeof accountId === "string") {
      return parseInt(accountId);
    }
    return accountId;
  }

  //calculate total cost of tickets excluding infants
  calculateCost(tickets) {
    let totalCost = 0;
    tickets.forEach((ticket) => {
      if (ticket.type !== "INFANT") {
        totalCost += this.prices[ticket.type] * ticket.quantity;
      }
    });
    return totalCost;
  }

  //calculate total cost of seats excluding infants as they are seated on Adults laps
  calculateSeats(tickets) {
    return tickets.reduce((total, ticket) => {
      if (ticket.getTicketType() === "INFANT") return total;
      return total + ticket.getNoOfTickets();
    }, 0);
  }
}
