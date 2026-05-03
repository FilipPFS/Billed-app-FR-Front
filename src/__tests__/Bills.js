import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import Bills from "../containers/Bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import router from "../app/Router.js";
import * as formatModule from "../app/format.js";

jest.mock("../app/Store.js", () => mockStore);

// test d'intégration GET
describe("Given I am connected as an employee", () => {
  describe("When I navigate to Bills", () => {
    test("fetches bills from mock API GET", async () => {
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }));
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByText("Mes notes de frais"));
      const bill1 = await screen.getByText("encore");
      expect(bill1).toBeTruthy();
      const bill2 = await screen.getByText("test1");
      expect(bill2).toBeTruthy();
    });
  });
});

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        }),
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i,
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
    test("When I click on the New Bill button, I should be sent to NewBill page", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      const handleClickNewBill = jest.fn(billsContainer.handleClickNewBill);
      const buttonNewBill = screen.getByTestId("btn-new-bill");

      buttonNewBill.addEventListener("click", handleClickNewBill);
      fireEvent.click(buttonNewBill);

      expect(handleClickNewBill).toHaveBeenCalled();
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
    });
    test("When I click on the icon eye, a modal should open with the bill image", () => {
      $.fn.modal = jest.fn();

      document.body.innerHTML = BillsUI({ data: bills });

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      const iconEye = screen.getAllByTestId("icon-eye")[0];

      const handleClickIconEye = jest.fn(
        billsContainer.handleClickIconEye(iconEye),
      );
      iconEye.addEventListener("click", handleClickIconEye);
      fireEvent.click(iconEye);

      expect(handleClickIconEye).toHaveBeenCalled();
      expect($.fn.modal).toHaveBeenCalledWith("show");
      const modal = document.getElementById("modaleFile");
      expect(modal).toBeTruthy();
    });
    describe("When I am on Bills Page and I call getBills", () => {
      test("Then it should fetch bills from mock storage and format them", async () => {
        const billsContainer = new Bills({
          document,
          onNavigate: null,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const result = await billsContainer.getBills();
        const mockData = await mockStore.bills().list();

        expect(result.length).toBe(mockData.length);
        expect(result[0].date).toBe(formatModule.formatDate(mockData[0].date));
      });

      test("Then it should handle corrupted date data (catch block coverage)", async () => {
        const formatDateSpy = jest
          .spyOn(formatModule, "formatDate")
          .mockImplementation(() => {
            throw new Error("formatDate error");
          });

        const consoleSpy = jest
          .spyOn(console, "log")
          .mockImplementation(() => {});

        const corruptedStore = {
          bills: () => ({
            list: () =>
              Promise.resolve([
                {
                  id: "123",
                  date: "invalid-date-format",
                  status: "pending",
                },
              ]),
          }),
        };

        const billsContainer = new Bills({
          document,
          onNavigate: null,
          store: corruptedStore,
          localStorage: window.localStorage,
        });

        const result = await billsContainer.getBills();

        expect(consoleSpy).toHaveBeenCalled();
        expect(result[0].date).toBe("invalid-date-format");

        formatDateSpy.mockRestore();
        consoleSpy.mockRestore();
      });
    });
    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          }),
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
